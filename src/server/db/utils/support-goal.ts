import { redis } from '@/lib/redis';
import { canReceiveSupport } from '@/lib/support-eligibility';
import {
  MAX_GOAL_AMOUNT,
  MIN_GOAL_AMOUNT,
  goalDisplayPercent,
} from '@/lib/support-goal';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { payment, support, supportGoal } from '../schema';
import { isProfileLinkEditor } from './link';

const GOAL_CACHE_SECONDS = 300;

export type PublicGoal = {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  percent: number;
  supporters: number;
  endsAt: Date | null;
};

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

async function progressOf(goalId: string) {
  const key = `support-goal:${goalId}`;
  const cached = await redis.get<{ collected: number; supporters: number }>(
    key
  );
  if (cached) {
    return cached;
  }
  const succeeded = and(
    eq(support.goalId, goalId),
    eq(payment.status, 'success')
  );
  const [collectedRows, supporterRows] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${payment.amount}), 0)` })
      .from(payment)
      .innerJoin(support, eq(payment.supportId, support.id))
      .where(succeeded),
    db
      .select({ count: sql<number>`count(distinct ${support.id})` })
      .from(support)
      .innerJoin(payment, eq(payment.supportId, support.id))
      .where(succeeded),
  ]);
  const progress = {
    collected: Number(collectedRows[0]?.total ?? 0),
    supporters: Number(supporterRows[0]?.count ?? 0),
  };
  await redis.set(key, progress, { ex: GOAL_CACHE_SECONDS });
  return progress;
}

function toPublic(
  row: {
    id: string;
    title: string;
    description: string | null;
    targetAmount: number;
    endsAt: Date | null;
  },
  progress: { collected: number; supporters: number }
): PublicGoal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    targetAmount: row.targetAmount,
    percent: goalDisplayPercent(progress.collected, row.targetAmount),
    supporters: progress.supporters,
    endsAt: row.endsAt,
  };
}

export async function activeGoalId(personalityId: string) {
  const row = await db.query.supportGoal.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.personalityId, personalityId),
        equals(table.status, 'active')
      ),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function activeCollected(personalityId: string) {
  const id = await activeGoalId(personalityId);
  if (!id) {
    return null;
  }
  const progress = await progressOf(id);
  return progress.collected;
}

export async function getPublicGoal(personalityId: string) {
  const row = await db.query.supportGoal.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.personalityId, personalityId),
        equals(table.status, 'active')
      ),
    columns: {
      id: true,
      title: true,
      description: true,
      targetAmount: true,
      endsAt: true,
    },
  });
  if (!row) {
    return null;
  }
  return toPublic(row, await progressOf(row.id));
}

export async function getGoalSnapshot(goalId: string) {
  const row = await db.query.supportGoal.findFirst({
    where: (table, { eq: equals }) => equals(table.id, goalId),
    columns: { id: true, title: true, targetAmount: true },
  });
  if (!row) {
    return null;
  }
  const progress = await progressOf(row.id);
  return {
    title: row.title,
    percent: goalDisplayPercent(progress.collected, row.targetAmount),
  };
}

export async function listClosedGoals(personalityId: string) {
  const rows = await db
    .select({
      id: supportGoal.id,
      title: supportGoal.title,
      description: supportGoal.description,
      targetAmount: supportGoal.targetAmount,
      endsAt: supportGoal.endsAt,
      closedAt: supportGoal.closedAt,
    })
    .from(supportGoal)
    .where(
      and(
        eq(supportGoal.personalityId, personalityId),
        eq(supportGoal.status, 'closed')
      )
    )
    .orderBy(desc(supportGoal.closedAt));
  return Promise.all(
    rows.map(async (row) => ({
      ...toPublic(row, await progressOf(row.id)),
      closedAt: row.closedAt,
    }))
  );
}

async function editableFiche(userId: string, slug: string) {
  const row = await db.query.link.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(equals(table.link, slug), equals(table.status, 'active')),
    columns: {
      id: true,
      userId: true,
      claimStatus: true,
      verificationStatus: true,
    },
  });
  if (!row) {
    return { error: 'not-found' as const };
  }
  const editor = await isProfileLinkEditor(userId, {
    id: row.id,
    userId: row.userId ?? '',
  });
  if (!editor) {
    return { error: 'forbidden' as const };
  }
  return { fiche: row };
}

export async function createSupportGoal(input: {
  userId: string;
  slug: string;
  title: string;
  description?: string;
  targetAmount: number;
  endsAt?: Date;
}) {
  if (
    !Number.isInteger(input.targetAmount) ||
    input.targetAmount < MIN_GOAL_AMOUNT ||
    input.targetAmount > MAX_GOAL_AMOUNT
  ) {
    return { error: 'invalid-amount' as const };
  }
  const access = await editableFiche(input.userId, input.slug);
  if ('error' in access) {
    return access;
  }
  if (!canReceiveSupport(access.fiche)) {
    return { error: 'not-eligible' as const };
  }
  try {
    const [row] = await db
      .insert(supportGoal)
      .values({
        personalityId: access.fiche.id,
        title: input.title,
        description: input.description ?? null,
        targetAmount: input.targetAmount,
        endsAt: input.endsAt ?? null,
        status: 'active',
      })
      .returning({ id: supportGoal.id });
    if (!row) {
      return { error: 'not-found' as const };
    }
    return { goalId: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: 'already-active' as const };
    }
    throw error;
  }
}

export async function closeSupportGoal(input: {
  userId: string;
  slug: string;
}) {
  const access = await editableFiche(input.userId, input.slug);
  if ('error' in access) {
    return access;
  }
  const [row] = await db
    .update(supportGoal)
    .set({ status: 'closed', closedAt: new Date() })
    .where(
      and(
        eq(supportGoal.personalityId, access.fiche.id),
        eq(supportGoal.status, 'active')
      )
    )
    .returning({ id: supportGoal.id });
  if (!row) {
    return { error: 'not-found' as const };
  }
  await redis.del(`support-goal:${row.id}`);
  return { goalId: row.id };
}

export async function getGoalTotal(input: { userId: string; slug: string }) {
  const access = await editableFiche(input.userId, input.slug);
  if ('error' in access) {
    return access;
  }
  const goal = await db.query.supportGoal.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.personalityId, access.fiche.id),
        equals(table.status, 'active')
      ),
    columns: { id: true },
  });
  if (!goal) {
    return { total: 0 };
  }
  const progress = await progressOf(goal.id);
  return { total: progress.collected };
}

export async function closeExpiredGoals() {
  const rows = await db
    .update(supportGoal)
    .set({ status: 'closed', closedAt: supportGoal.endsAt })
    .where(
      and(
        eq(supportGoal.status, 'active'),
        isNotNull(supportGoal.endsAt),
        sql`${supportGoal.endsAt} < now()`
      )
    )
    .returning({ id: supportGoal.id });
  await Promise.all(rows.map((row) => redis.del(`support-goal:${row.id}`)));
  return rows.length;
}

export async function claimReachedGoal(goalId: string) {
  const row = await db.query.supportGoal.findFirst({
    where: (table, { eq: equals }) => equals(table.id, goalId),
    columns: {
      id: true,
      title: true,
      targetAmount: true,
      personalityId: true,
      reachedNotifiedAt: true,
    },
  });
  if (!row || row.reachedNotifiedAt) {
    return null;
  }
  const progress = await progressOf(row.id);
  const percent = goalDisplayPercent(progress.collected, row.targetAmount);
  if (percent < 100) {
    return null;
  }
  const [claimed] = await db
    .update(supportGoal)
    .set({ reachedNotifiedAt: new Date() })
    .where(
      and(eq(supportGoal.id, row.id), isNull(supportGoal.reachedNotifiedAt))
    )
    .returning({ id: supportGoal.id });
  if (!claimed) {
    return null;
  }
  return {
    personalityId: row.personalityId,
    title: row.title,
    targetAmount: row.targetAmount,
    percent,
  };
}

export async function releaseReachedClaim(goalId: string) {
  await db
    .update(supportGoal)
    .set({ reachedNotifiedAt: null })
    .where(eq(supportGoal.id, goalId));
}

export async function personalityIdForSlug(slug: string) {
  const row = await db.query.link.findFirst({
    where: (table, { and: also, eq: equals }) =>
      also(
        equals(table.link, slug),
        equals(table.status, 'active'),
        equals(table.isPublic, true)
      ),
    columns: { id: true },
  });
  return row?.id ?? null;
}
