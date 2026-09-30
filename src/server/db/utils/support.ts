import {
  MAX_SUPPORT_AMOUNT,
  MIN_SUPPORT_AMOUNT,
  SUPPORT_CURRENCY,
  splitWithdrawal,
  supportCommissionBps,
} from '@/lib/money';
import { getCheckoutProvider } from '@/server/payments/provider';
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  ledgerEntry,
  payment,
  paymentEvent,
  recurringSupport,
  support,
  withdrawal,
} from '../schema';
import type { paymentStatuses } from '../schema/support';

type PaymentStatus = (typeof paymentStatuses)[number];

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['success', 'failed', 'cancelled'],
  success: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
};

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  if ('code' in error && error.code === '23505') {
    return true;
  }
  if ('cause' in error) {
    return isUniqueViolation(error.cause);
  }
  return false;
}

async function insertLedgerOnce(values: typeof ledgerEntry.$inferInsert) {
  try {
    await db.insert(ledgerEntry).values(values);
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }
}

export const getSupportPage = async (slug: string) => {
  const row = await db.query.link.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.link, slug),
        equals(table.status, 'active'),
        equals(table.isPublic, true)
      ),
    columns: {
      id: true,
      link: true,
      name: true,
      image: true,
      theme: true,
      accentColor: true,
      darkMode: true,
      verificationStatus: true,
    },
  });
  if (!row) {
    return null;
  }
  const { link: rowSlug, ...rest } = row;
  return { ...rest, slug: rowSlug };
};

function addOneMonth(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

async function insertPendingPayment(supportId: string, amount: number) {
  const provider = getCheckoutProvider();
  const started = provider.start();
  const insertedPayment = await db
    .insert(payment)
    .values({
      supportId,
      provider: provider.id,
      providerReference: started.providerReference,
      status: 'pending',
      amount,
      currency: SUPPORT_CURRENCY,
    })
    .returning({ id: payment.id });
  const paymentRow = insertedPayment[0];
  if (!paymentRow) {
    throw new Error('payment-insert-failed');
  }
  return {
    paymentId: paymentRow.id,
    checkoutPath: `/support/checkout/${paymentRow.id}`,
  };
}

async function insertActivePlan(input: {
  personalityId: string;
  userId: string;
  amount: number;
  displayName?: string;
  isPublic: boolean;
}) {
  try {
    const insertedPlan = await db
      .insert(recurringSupport)
      .values({
        personalityId: input.personalityId,
        userId: input.userId,
        amount: input.amount,
        currency: SUPPORT_CURRENCY,
        displayName: input.displayName,
        isPublic: input.isPublic,
        status: 'active',
      })
      .returning({ id: recurringSupport.id });
    const id = insertedPlan[0]?.id;
    if (!id) {
      return { ok: false as const, error: 'not-found' as const };
    }
    return { ok: true as const, id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false as const, error: 'already-active' as const };
    }
    throw error;
  }
}

async function removeCheckoutDraft(
  supportId: string,
  recurringSupportId: string | null
) {
  await db.delete(support).where(eq(support.id, supportId));
  if (!recurringSupportId) {
    return;
  }
  await db
    .delete(recurringSupport)
    .where(eq(recurringSupport.id, recurringSupportId));
}

type CheckoutResult =
  | {
      error:
        | 'invalid-amount'
        | 'not-found'
        | 'account-required'
        | 'already-active';
    }
  | { paymentId: string; checkoutPath: string };

export const createSupportCheckout = async (input: {
  slug: string;
  amount: number;
  displayName?: string;
  isPublic: boolean;
  userId?: string | null;
  interval: 'once' | 'month';
}): Promise<CheckoutResult> => {
  if (
    input.amount < MIN_SUPPORT_AMOUNT ||
    input.amount > MAX_SUPPORT_AMOUNT ||
    !Number.isInteger(input.amount)
  ) {
    return { error: 'invalid-amount' as const };
  }

  const personalityRow = await getSupportPage(input.slug);
  if (!personalityRow) {
    return { error: 'not-found' as const };
  }
  if (input.interval === 'month' && !input.userId) {
    return { error: 'account-required' as const };
  }

  let recurringSupportId: string | null = null;
  if (input.interval === 'month' && input.userId) {
    const plan = await insertActivePlan({
      personalityId: personalityRow.id,
      userId: input.userId,
      amount: input.amount,
      displayName: input.displayName,
      isPublic: input.isPublic,
    });
    if (!plan.ok) {
      return { error: plan.error };
    }
    recurringSupportId = plan.id;
  }

  const insertedSupport = await db
    .insert(support)
    .values({
      personalityId: personalityRow.id,
      userId: input.userId ?? null,
      recurringSupportId,
      amount: input.amount,
      currency: SUPPORT_CURRENCY,
      displayName: input.displayName,
      isPublic: input.isPublic,
    })
    .returning({ id: support.id });
  const supportRow = insertedSupport[0];
  if (!supportRow) {
    if (recurringSupportId) {
      await db
        .delete(recurringSupport)
        .where(eq(recurringSupport.id, recurringSupportId));
    }
    return { error: 'not-found' as const };
  }

  try {
    return await insertPendingPayment(supportRow.id, input.amount);
  } catch (error) {
    await removeCheckoutDraft(supportRow.id, recurringSupportId);
    throw error;
  }
};

export const getCheckout = async (paymentId: string) => {
  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) => equals(table.id, paymentId),
    columns: {
      id: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
    },
    with: {
      support: {
        columns: { id: true },
        with: {
          personality: { columns: { name: true, link: true } },
        },
      },
    },
  });
  if (!row?.support?.personality) {
    return null;
  }
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    personalityName: row.support.personality.name,
    personalitySlug: row.support.personality.link,
    canSimulate: row.provider === 'sandbox' && row.status === 'pending',
  };
};

async function recordPaymentEvent(input: {
  eventId: string;
  providerReference: string;
  status: PaymentStatus;
}) {
  try {
    await db.insert(paymentEvent).values(input);
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return false;
    }
    throw error;
  }
}

async function writePaymentLedger(
  row: {
    id: string;
    amount: number;
    currency: string;
    supportId: string;
    personalityId: string;
  },
  status: 'success' | 'refunded'
) {
  if (status === 'success') {
    await insertLedgerOnce({
      personalityId: row.personalityId,
      supportId: row.supportId,
      paymentId: row.id,
      entryType: 'credit',
      amount: row.amount,
      currency: row.currency,
      idempotencyKey: `payment:${row.id}:credit`,
    });
    return;
  }
  await insertLedgerOnce({
    personalityId: row.personalityId,
    supportId: row.supportId,
    paymentId: row.id,
    entryType: 'debit',
    amount: row.amount,
    currency: row.currency,
    idempotencyKey: `payment:${row.id}:refund`,
  });
}

export const applyPaymentEvent = async (input: {
  eventId: string;
  providerReference: string;
  status: PaymentStatus;
}) => {
  const existingEvent = await db.query.paymentEvent.findFirst({
    where: (table, { eq: equals }) => equals(table.eventId, input.eventId),
    columns: { id: true },
  });
  if (existingEvent) {
    return { ok: true as const, duplicate: true as const };
  }

  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) =>
      equals(table.providerReference, input.providerReference),
    columns: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      supportId: true,
    },
    with: {
      support: {
        columns: { personalityId: true, recurringSupportId: true },
      },
    },
  });
  if (!row?.support) {
    return { error: 'not-found' as const };
  }
  if (row.status === input.status) {
    await recordPaymentEvent(input);
    return { ok: true as const, duplicate: true as const };
  }
  if (!PAYMENT_TRANSITIONS[row.status].includes(input.status)) {
    return { error: 'invalid-transition' as const };
  }

  if (input.status === 'success' || input.status === 'refunded') {
    await writePaymentLedger(
      {
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        supportId: row.supportId,
        personalityId: row.support.personalityId,
      },
      input.status
    );
  }

  await db
    .update(payment)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(payment.id, row.id));
  if (input.status === 'success' && row.support.recurringSupportId) {
    await db
      .update(recurringSupport)
      .set({
        nextChargeAt: addOneMonth(new Date()),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringSupport.id, row.support.recurringSupportId),
          eq(recurringSupport.status, 'active')
        )
      );
  }
  await recordPaymentEvent(input);
  return { ok: true as const, duplicate: false as const };
};

export const confirmSandboxPayment = async (paymentId: string) => {
  if (process.env.NODE_ENV === 'production') {
    return { error: 'unavailable' as const };
  }
  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) => equals(table.id, paymentId),
    columns: {
      id: true,
      provider: true,
      providerReference: true,
      status: true,
    },
  });
  if (!row || row.provider !== 'sandbox') {
    return { error: 'not-found' as const };
  }
  return applyPaymentEvent({
    eventId: `sandbox-confirm:${row.id}`,
    providerReference: row.providerReference,
    status: 'success',
  });
};

async function ledgerBalance(personalityId: string) {
  const entries = await db
    .select({
      entryType: ledgerEntry.entryType,
      amount: ledgerEntry.amount,
    })
    .from(ledgerEntry)
    .where(eq(ledgerEntry.personalityId, personalityId));
  let balance = 0;
  for (const entry of entries) {
    if (entry.entryType === 'credit') {
      balance += entry.amount;
    } else {
      balance -= entry.amount;
    }
  }
  return balance;
}

export const getWithdrawalPage = async (slug: string, userId: string) => {
  const personalityRow = await db.query.link.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.link, slug),
        equals(table.status, 'active'),
        equals(table.isPublic, true)
      ),
    columns: { id: true, link: true, name: true, userId: true },
  });
  if (!personalityRow) {
    return null;
  }
  const manager = await db.query.personalityManager.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.personalityId, personalityRow.id),
        equals(table.userId, userId)
      ),
    columns: { id: true },
  });
  if (!manager && personalityRow.userId !== userId) {
    return { forbidden: true as const };
  }

  const pendingRows = await db
    .select({ grossAmount: withdrawal.grossAmount })
    .from(withdrawal)
    .where(
      and(
        eq(withdrawal.personalityId, personalityRow.id),
        eq(withdrawal.status, 'pending')
      )
    );
  const reserved = pendingRows.reduce((sum, row) => sum + row.grossAmount, 0);
  const available = (await ledgerBalance(personalityRow.id)) - reserved;
  const requests = await db.query.withdrawal.findMany({
    where: (table, { eq: equals }) =>
      equals(table.personalityId, personalityRow.id),
    columns: {
      id: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      status: true,
      createdAt: true,
    },
    orderBy: (table, { desc }) => desc(table.createdAt),
    limit: 20,
  });

  return {
    personality: {
      id: personalityRow.id,
      slug: personalityRow.link,
      name: personalityRow.name,
    },
    available,
    commissionBps: supportCommissionBps(),
    withdrawals: requests,
  };
};

export const requestWithdrawal = async (input: {
  slug: string;
  userId: string;
  grossAmount: number;
}) => {
  const page = await getWithdrawalPage(input.slug, input.userId);
  if (!page) {
    return { error: 'not-found' as const };
  }
  if ('forbidden' in page) {
    return { error: 'forbidden' as const };
  }
  const parts = splitWithdrawal(input.grossAmount, page.commissionBps);
  if (
    !Number.isInteger(input.grossAmount) ||
    input.grossAmount < MIN_SUPPORT_AMOUNT ||
    parts.netAmount <= 0 ||
    input.grossAmount > page.available
  ) {
    return { error: 'invalid-amount' as const };
  }

  const inserted = await db
    .insert(withdrawal)
    .values({
      personalityId: page.personality.id,
      requestedByUserId: input.userId,
      grossAmount: input.grossAmount,
      commissionBps: page.commissionBps,
      commissionAmount: parts.commissionAmount,
      netAmount: parts.netAmount,
      currency: SUPPORT_CURRENCY,
      status: 'pending',
    })
    .returning({
      id: withdrawal.id,
      status: withdrawal.status,
      netAmount: withdrawal.netAmount,
      commissionAmount: withdrawal.commissionAmount,
    });
  const row = inserted[0];
  if (!row) {
    return { error: 'invalid-amount' as const };
  }
  return { withdrawal: row };
};

export const applyPayoutEvent = async (input: {
  eventId: string;
  withdrawalId: string;
  status: PaymentStatus;
}) => {
  const existingEvent = await db.query.paymentEvent.findFirst({
    where: (table, { eq: equals }) => equals(table.eventId, input.eventId),
    columns: { id: true },
  });
  if (existingEvent) {
    return { ok: true as const, duplicate: true as const };
  }

  const row = await db.query.withdrawal.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.withdrawalId),
    columns: {
      id: true,
      status: true,
      personalityId: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      currency: true,
    },
  });
  if (!row) {
    return { error: 'not-found' as const };
  }
  if (row.status === input.status) {
    await recordPaymentEvent({
      eventId: input.eventId,
      providerReference: row.id,
      status: input.status,
    });
    return { ok: true as const, duplicate: true as const };
  }
  if (!PAYMENT_TRANSITIONS[row.status].includes(input.status)) {
    return { error: 'invalid-transition' as const };
  }

  if (input.status === 'success') {
    await insertLedgerOnce({
      personalityId: row.personalityId,
      withdrawalId: row.id,
      entryType: 'fee',
      amount: row.commissionAmount,
      currency: row.currency,
      idempotencyKey: `withdrawal:${row.id}:fee`,
    });
    await insertLedgerOnce({
      personalityId: row.personalityId,
      withdrawalId: row.id,
      entryType: 'withdrawal',
      amount: row.netAmount,
      currency: row.currency,
      idempotencyKey: `withdrawal:${row.id}:net`,
    });
  }

  await db
    .update(withdrawal)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(withdrawal.id, row.id));
  await recordPaymentEvent({
    eventId: input.eventId,
    providerReference: row.id,
    status: input.status,
  });
  return { ok: true as const, duplicate: false as const };
};

async function pendingCheckoutPath(recurringSupportId: string) {
  const rows = await db.query.support.findMany({
    where: (table, { eq: equals }) =>
      equals(table.recurringSupportId, recurringSupportId),
    columns: { id: true },
    with: {
      payments: { columns: { id: true, status: true } },
    },
  });
  for (const row of rows) {
    const pending = row.payments.find((item) => item.status === 'pending');
    if (pending) {
      return `/support/checkout/${pending.id}`;
    }
  }
  return null;
}

export const prepareDueCharges = async (userId: string) => {
  const due = await db.query.recurringSupport.findMany({
    where: (table, { and: also, eq: equals, isNotNull, lte }) =>
      also(
        equals(table.userId, userId),
        equals(table.status, 'active'),
        isNotNull(table.nextChargeAt),
        lte(table.nextChargeAt, new Date())
      ),
  });

  for (const plan of due) {
    const dueAt = plan.nextChargeAt;
    if (!dueAt) {
      continue;
    }
    const issued = await db.query.support.findFirst({
      where: (table, { and: also, eq: equals, gte }) =>
        also(
          equals(table.recurringSupportId, plan.id),
          gte(table.createdAt, dueAt)
        ),
      columns: { id: true },
    });
    if (issued) {
      continue;
    }
    const inserted = await db
      .insert(support)
      .values({
        personalityId: plan.personalityId,
        userId: plan.userId,
        recurringSupportId: plan.id,
        amount: plan.amount,
        currency: plan.currency,
        displayName: plan.displayName,
        isPublic: plan.isPublic,
      })
      .returning({ id: support.id });
    const row = inserted[0];
    if (row) {
      await insertPendingPayment(row.id, plan.amount);
    }
  }
};

export const getSupporterHistory = async (userId: string) => {
  await prepareDueCharges(userId);
  const [supports, plans] = await Promise.all([
    db.query.support.findMany({
      where: (table, { eq: equals }) => equals(table.userId, userId),
      columns: {
        id: true,
        amount: true,
        displayName: true,
        isPublic: true,
        createdAt: true,
        recurringSupportId: true,
      },
      with: {
        personality: { columns: { name: true, link: true, image: true } },
        payments: { columns: { id: true, status: true } },
      },
      orderBy: (table, { desc }) => desc(table.createdAt),
      limit: 30,
    }),
    db.query.recurringSupport.findMany({
      where: (table, { and: also, eq: equals }) =>
        also(equals(table.userId, userId), equals(table.status, 'active')),
      columns: {
        id: true,
        amount: true,
        nextChargeAt: true,
        isPublic: true,
      },
      with: {
        personality: { columns: { name: true, link: true, image: true } },
      },
      orderBy: (table, { desc }) => desc(table.createdAt),
    }),
  ]);

  const recurrings = await Promise.all(
    plans.map(async (plan) => ({
      ...plan,
      personality: {
        name: plan.personality.name,
        slug: plan.personality.link,
        image: plan.personality.image,
      },
      checkoutPath: await pendingCheckoutPath(plan.id),
    }))
  );

  return {
    supports: supports.map((item) => ({
      ...item,
      personality: {
        name: item.personality.name,
        slug: item.personality.link,
        image: item.personality.image,
      },
      paymentStatus: item.payments[0]?.status ?? null,
    })),
    recurrings,
  };
};

export const setSupportVisibility = async (input: {
  userId: string;
  supportId: string;
  isPublic: boolean;
}) => {
  const updated = await db
    .update(support)
    .set({ isPublic: input.isPublic })
    .where(
      and(eq(support.id, input.supportId), eq(support.userId, input.userId))
    )
    .returning({ id: support.id, isPublic: support.isPublic });
  if (!updated[0]) {
    return { error: 'not-found' as const };
  }
  return { support: updated[0] };
};

export const cancelRecurringSupport = async (input: {
  userId: string;
  recurringSupportId: string;
}) => {
  const updated = await db
    .update(recurringSupport)
    .set({ status: 'cancelled', updatedAt: new Date(), nextChargeAt: null })
    .where(
      and(
        eq(recurringSupport.id, input.recurringSupportId),
        eq(recurringSupport.userId, input.userId),
        eq(recurringSupport.status, 'active')
      )
    )
    .returning({ id: recurringSupport.id });
  if (!updated[0]) {
    return { error: 'not-found' as const };
  }
  return { recurringSupport: updated[0] };
};

export const listPublicSupporterNames = async (personalityId: string) => {
  const rows = await db
    .select({ displayName: support.displayName })
    .from(support)
    .innerJoin(payment, eq(payment.supportId, support.id))
    .where(
      and(
        eq(support.personalityId, personalityId),
        eq(support.isPublic, true),
        eq(payment.status, 'success')
      )
    );
  return [
    ...new Set(
      rows.flatMap((row) => (row.displayName ? [row.displayName] : []))
    ),
  ];
};

export const getSupportersPreview = async (
  personalityId: string,
  limit = 5
) => {
  const succeeded = and(
    eq(support.personalityId, personalityId),
    eq(payment.status, 'success')
  );

  const [countRows, publicRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(distinct ${support.id})` })
      .from(support)
      .innerJoin(payment, eq(payment.supportId, support.id))
      .where(succeeded),
    db
      .select({ displayName: support.displayName })
      .from(support)
      .innerJoin(payment, eq(payment.supportId, support.id))
      .where(
        and(
          succeeded,
          eq(support.isPublic, true),
          isNotNull(support.displayName)
        )
      )
      .orderBy(desc(support.createdAt))
      .limit(limit * 4),
  ]);

  const names = [
    ...new Set(
      publicRows.flatMap((row) =>
        row.displayName?.trim() ? [row.displayName.trim()] : []
      )
    ),
  ].slice(0, limit);

  return {
    count: Number(countRows[0]?.count ?? 0),
    recent: names.map((displayName) => ({ displayName })),
  };
};

// Successful supports per personality, for directory cards. No amounts.
export const countSupportsByPersonality = async (personalityIds: string[]) => {
  if (personalityIds.length === 0) {
    return new Map<string, number>();
  }
  const rows = await db
    .select({
      personalityId: support.personalityId,
      count: sql<number>`count(distinct ${support.id})`,
    })
    .from(support)
    .innerJoin(payment, eq(payment.supportId, support.id))
    .where(
      and(
        inArray(support.personalityId, personalityIds),
        eq(payment.status, 'success')
      )
    )
    .groupBy(support.personalityId);

  return new Map(rows.map((row) => [row.personalityId, Number(row.count)]));
};
