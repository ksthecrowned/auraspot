import { slugifyPersonalityName } from '@/lib/personality';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  category,
  link,
  payment,
  personalityClaim,
  personalityReport,
  support,
  withdrawal,
} from '../schema';

const LIKE_ESCAPE_RE = /[%_\\]/g;

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

async function countPersonalities(status?: 'active' | 'suspended') {
  const query = db.select({ value: count() }).from(link);
  const rows = status
    ? await query.where(eq(link.status, status))
    : await query;
  return rows[0]?.value ?? 0;
}

export const getAdminOverview = async () => {
  const [
    personalities,
    suspended,
    openClaims,
    categories,
    payments,
    pendingWithdrawals,
    openReports,
  ] = await Promise.all([
    countPersonalities(),
    countPersonalities('suspended'),
    db
      .select({ value: count() })
      .from(personalityClaim)
      .where(eq(personalityClaim.status, 'PENDING'))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(category)
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(payment)
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(withdrawal)
      .where(eq(withdrawal.status, 'pending'))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(personalityReport)
      .where(eq(personalityReport.status, 'open'))
      .then((rows) => rows[0]?.value ?? 0),
  ]);

  return {
    personalities,
    suspended,
    openClaims,
    categories,
    payments,
    pendingWithdrawals,
    openReports,
  };
};

export const listPersonalitiesForAdmin = async (query?: string) => {
  const needle = query?.trim();
  const rows = await db.query.link.findMany({
    where: needle
      ? (table, { ilike: like }) => like(table.name, `%${escapeLike(needle)}%`)
      : undefined,
    columns: {
      id: true,
      name: true,
      link: true,
      status: true,
      claimStatus: true,
      verificationStatus: true,
      location: true,
    },
    with: {
      category: { columns: { name: true } },
    },
    orderBy: (table, { desc: latest }) => latest(table.createdAt),
    limit: 50,
  });
  return rows.map((row) => ({ ...row, slug: row.link }));
};

function escapeLike(value: string) {
  return value.replace(LIKE_ESCAPE_RE, '\\$&');
}

export const setPersonalityPublication = async (input: {
  personalityId: string;
  status: 'active' | 'suspended';
}) => {
  const updated = await db
    .update(link)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(link.id, input.personalityId))
    .returning({ id: link.id, status: link.status });
  const row = updated[0];
  if (!row) {
    return { ok: false as const, error: 'not-found' as const };
  }
  return { ok: true as const, personality: row };
};

export const listCategoriesForAdmin = async () => {
  return db.query.category.findMany({
    columns: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
    },
    orderBy: (table, { asc }) => asc(table.sortOrder),
  });
};

export const createCategory = async (name: string) => {
  const slug = slugifyPersonalityName(name);
  if (slug.length < 2) {
    return { ok: false as const, error: 'invalid-name' as const };
  }
  const latest = await db
    .select({ sortOrder: category.sortOrder })
    .from(category)
    .orderBy(desc(category.sortOrder))
    .limit(1);
  try {
    const inserted = await db
      .insert(category)
      .values({
        name,
        slug,
        sortOrder: (latest[0]?.sortOrder ?? 0) + 1,
      })
      .returning({
        id: category.id,
        name: category.name,
        slug: category.slug,
      });
    const row = inserted[0];
    if (!row) {
      return { ok: false as const, error: 'invalid-name' as const };
    }
    return { ok: true as const, category: row };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false as const, error: 'slug-taken' as const };
    }
    throw error;
  }
};

export const updateCategory = async (input: {
  categoryId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}) => {
  const updated = await db
    .update(category)
    .set({
      name: input.name,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(category.id, input.categoryId))
    .returning({ id: category.id });
  if (!updated[0]) {
    return { ok: false as const, error: 'not-found' as const };
  }
  return { ok: true as const, category: updated[0] };
};

export const listPaymentsForAdmin = () => {
  return db
    .select({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
      personalityName: link.name,
      personalitySlug: link.link,
    })
    .from(payment)
    .innerJoin(support, eq(payment.supportId, support.id))
    .innerJoin(link, eq(support.personalityId, link.id))
    .orderBy(desc(payment.createdAt))
    .limit(50);
};

export const listWithdrawalsForAdmin = async () => {
  const rows = await db.query.withdrawal.findMany({
    columns: {
      id: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      status: true,
      createdAt: true,
    },
    with: {
      personality: { columns: { name: true, link: true } },
    },
    orderBy: (table, { desc: latest }) => latest(table.createdAt),
    limit: 50,
  });
  return rows.map((row) => ({
    ...row,
    personality: {
      name: row.personality.name,
      slug: row.personality.link,
    },
  }));
};

export const createPersonalityReport = async (input: {
  slug: string;
  reason: 'impersonation' | 'inappropriate' | 'other';
  details: string;
  reporterUserId?: string | null;
}) => {
  const personalityRow = await db.query.link.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.link, input.slug),
        equals(table.status, 'active'),
        equals(table.isPublic, true)
      ),
    columns: { id: true },
  });
  if (!personalityRow) {
    return { ok: false as const, error: 'not-found' as const };
  }
  const inserted = await db
    .insert(personalityReport)
    .values({
      personalityId: personalityRow.id,
      reporterUserId: input.reporterUserId ?? null,
      reason: input.reason,
      details: input.details,
    })
    .returning({ id: personalityReport.id });
  const row = inserted[0];
  if (!row) {
    return { ok: false as const, error: 'not-found' as const };
  }
  return { ok: true as const, report: row };
};

export const listReportsForAdmin = async () => {
  const rows = await db.query.personalityReport.findMany({
    where: (table, { eq: equals }) => equals(table.status, 'open'),
    columns: {
      id: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
    },
    with: {
      personality: {
        columns: { id: true, name: true, link: true, status: true },
      },
    },
    orderBy: (table, { desc: latest }) => latest(table.createdAt),
    limit: 50,
  });
  return rows.map((row) => ({
    ...row,
    personality: {
      id: row.personality.id,
      name: row.personality.name,
      slug: row.personality.link,
      status: row.personality.status,
    },
  }));
};

export const reviewPersonalityReport = async (input: {
  reportId: string;
  decision: 'dismissed' | 'suspend';
}) => {
  const report = await db.query.personalityReport.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.reportId),
    columns: { id: true, status: true, personalityId: true },
  });
  if (!report || report.status !== 'open') {
    return { ok: false as const, error: 'not-found' as const };
  }
  if (input.decision === 'suspend') {
    await db
      .update(link)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(link.id, report.personalityId));
  }
  const updated = await db
    .update(personalityReport)
    .set({
      status: input.decision === 'suspend' ? 'resolved' : 'dismissed',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(personalityReport.id, report.id),
        eq(personalityReport.status, 'open')
      )
    )
    .returning({ id: personalityReport.id });
  if (!updated[0]) {
    return { ok: false as const, error: 'not-found' as const };
  }
  return { ok: true as const, report: updated[0] };
};
