import { env } from '@/env.mjs';
import {
  MAX_SUPPORT_AMOUNT,
  MIN_SUPPORT_AMOUNT,
  SUPPORT_CURRENCY,
  splitWithdrawal,
  supportCommissionBps,
} from '@/lib/money';
import {
  MobileMoneyError,
  type MobileMoneyOperator,
  getProviderStatus,
  isMobileMoneyOperator,
  operatorServes,
  requestToPay,
} from '@/server/payments/mobile-money';
import { getCheckoutProvider } from '@/server/payments/provider';
import { and, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
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

const TRAILING_SLASH_RE = /\/$/;
import { toMsisdn } from '@/lib/phone-countries';
import { notifyPlanPaused } from './recurring-emails';

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

export async function insertPendingPayment(supportId: string, amount: number) {
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

// Retry delay and number of failed renewals before a plan is paused.
export const RENEWAL_RETRY_DAYS = 3;
export const MAX_RENEWAL_FAILURES = 3;

async function planHasSuccessfulPayment(recurringSupportId: string) {
  const rows = await db
    .select({ id: payment.id })
    .from(payment)
    .innerJoin(support, eq(payment.supportId, support.id))
    .where(
      and(
        eq(support.recurringSupportId, recurringSupportId),
        eq(payment.status, 'success')
      )
    )
    .limit(1);
  return rows.length > 0;
}

// An "active" plan whose first payment never went through (abandoned
// checkout) is cancelled so the supporter can start again.
async function cancelUnpaidActivePlan(userId: string, personalityId: string) {
  const existing = await db.query.recurringSupport.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.userId, userId),
        equals(table.personalityId, personalityId),
        equals(table.status, 'active')
      ),
    columns: { id: true },
  });
  if (!existing || (await planHasSuccessfulPayment(existing.id))) {
    return false;
  }
  await db
    .update(recurringSupport)
    .set({ status: 'cancelled', nextChargeAt: null, updatedAt: new Date() })
    .where(eq(recurringSupport.id, existing.id));
  return true;
}

async function insertActivePlan(
  input: {
    personalityId: string;
    userId: string;
    amount: number;
    displayName?: string;
    isPublic: boolean;
  },
  retried = false
): Promise<
  | { ok: true; id: string }
  | { ok: false; error: 'not-found' | 'already-active' }
> {
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
      if (
        !retried &&
        (await cancelUnpaidActivePlan(input.userId, input.personalityId))
      ) {
        return insertActivePlan(input, true);
      }
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
    // No operator chosen yet: the payer can pick MTN MoMo or Airtel Money.
    canPay: row.provider === 'sandbox' && row.status === 'pending',
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

// First payment failed: the plan never started, cancel it. Renewal failed:
// retry in a few days, pause after MAX_RENEWAL_FAILURES.
async function handlePlanPaymentFailure(planId: string) {
  const plan = await db.query.recurringSupport.findFirst({
    where: (table, { eq: equals }) => equals(table.id, planId),
    columns: { status: true, failedAttempts: true },
  });
  if (plan?.status !== 'active') {
    return;
  }
  if (!(await planHasSuccessfulPayment(planId))) {
    await db
      .update(recurringSupport)
      .set({ status: 'cancelled', nextChargeAt: null, updatedAt: new Date() })
      .where(eq(recurringSupport.id, planId));
    return;
  }
  const failedAttempts = plan.failedAttempts + 1;
  const paused = failedAttempts >= MAX_RENEWAL_FAILURES;
  const retryAt = new Date();
  retryAt.setDate(retryAt.getDate() + RENEWAL_RETRY_DAYS);
  await db
    .update(recurringSupport)
    .set({
      failedAttempts,
      status: paused ? 'paused' : 'active',
      nextChargeAt: paused ? null : retryAt,
      updatedAt: new Date(),
    })
    .where(eq(recurringSupport.id, planId));
  if (paused) {
    await notifyPlanPaused(planId).catch(() => null);
  }
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
      provider: true,
      payerPhone: true,
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
  const planId = row.support.recurringSupportId;
  if (planId && input.status === 'success') {
    await db
      .update(recurringSupport)
      .set({
        nextChargeAt: addOneMonth(new Date()),
        failedAttempts: 0,
        // Renewals are requested on the number that just paid.
        ...(isMobileMoneyOperator(row.provider) && row.payerPhone
          ? { payerOperator: row.provider, payerPhone: row.payerPhone }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringSupport.id, planId),
          eq(recurringSupport.status, 'active')
        )
      );
  }
  if (planId && (input.status === 'failed' || input.status === 'cancelled')) {
    await handlePlanPaymentFailure(planId);
  }
  await recordPaymentEvent(input);
  return { ok: true as const, duplicate: false as const };
};

// Callbacks need a public HTTPS URL; skipped for localhost.
function mobileMoneyCallbackUrl(operator: MobileMoneyOperator) {
  const base = env.NEXT_PUBLIC_URL.replace(TRAILING_SLASH_RE, '');
  if (!base.startsWith('https://')) {
    return undefined;
  }
  return `${base}/api/webhook/${operator === 'mtn_momo' ? 'momo' : 'airtel'}`;
}

// The payer picked an operator on the checkout page: send the USSD push.
// A payment is sent to an operator only once; if it fails the supporter
// starts a new donation.
export const startMobileMoneyPayment = async (input: {
  paymentId: string;
  operator: MobileMoneyOperator;
  country: string;
  phone: string;
}) => {
  const payer = toMsisdn(input.country, input.phone);
  if (!payer) {
    return { error: 'invalid-phone' as const };
  }
  if (!operatorServes(input.operator, payer.country.iso)) {
    return { error: 'not-configured' as const };
  }
  const reference = crypto.randomUUID();
  const [claimed] = await db
    .update(payment)
    .set({
      provider: input.operator,
      providerReference: reference,
      payerPhone: `+${payer.msisdn}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payment.id, input.paymentId),
        eq(payment.provider, 'sandbox'),
        eq(payment.status, 'pending')
      )
    )
    .returning({ id: payment.id, amount: payment.amount });
  if (!claimed) {
    return { error: 'not-payable' as const };
  }

  try {
    await requestToPay(input.operator, {
      reference,
      externalId: claimed.id,
      amount: claimed.amount,
      payer: {
        iso: payer.country.iso,
        msisdn: payer.msisdn,
        national: payer.national,
      },
      callbackUrl: mobileMoneyCallbackUrl(input.operator),
    });
  } catch (error) {
    await applyPaymentEvent({
      eventId: `${input.operator}:${reference}:request-failed`,
      providerReference: reference,
      status: 'failed',
    });
    return {
      error: 'operator-refused' as const,
      message: error instanceof MobileMoneyError ? error.message : undefined,
    };
  }
  return { ok: true as const };
};

// Reads the status from the operator and applies it. Used by the checkout
// page (polling) and by operator callbacks, whose payload is never trusted.
export const syncMobileMoneyPayment = async (
  where: { paymentId: string } | { providerReference: string }
) => {
  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) =>
      'paymentId' in where
        ? equals(table.id, where.paymentId)
        : equals(table.providerReference, where.providerReference),
    columns: { provider: true, providerReference: true, status: true },
  });
  if (!row) {
    return null;
  }
  if (row.status !== 'pending' || !isMobileMoneyOperator(row.provider)) {
    return row.status;
  }
  const status = await getProviderStatus(row.provider, row.providerReference);
  if (status === 'pending') {
    return 'pending';
  }
  await applyPaymentEvent({
    eventId: `${row.provider}:${row.providerReference}:${status}`,
    providerReference: row.providerReference,
    status,
  });
  return status;
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

export const getSupporterHistory = async (userId: string) => {
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
      where: (table, { and: also, eq: equals, inArray: inArrayOf }) =>
        also(
          equals(table.userId, userId),
          inArrayOf(table.status, ['active', 'paused'])
        ),
      columns: {
        id: true,
        status: true,
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
        inArray(recurringSupport.status, ['active', 'paused'])
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

// Personalities with the most successful supports since `since` (home page).
export const topSupportedPersonalityIds = async (
  since: Date,
  limit: number
) => {
  const rows = await db
    .select({
      personalityId: support.personalityId,
      count: sql<number>`count(distinct ${support.id})`,
    })
    .from(support)
    .innerJoin(payment, eq(payment.supportId, support.id))
    .where(and(eq(payment.status, 'success'), gte(support.createdAt, since)))
    .groupBy(support.personalityId)
    .orderBy(desc(sql`count(distinct ${support.id})`))
    .limit(limit);

  return rows.map((row) => row.personalityId);
};
