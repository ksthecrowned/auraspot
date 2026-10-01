import { bioFromPlainText, plainTextFromBio } from '@/lib/admin-fiche';
import { slugifyPersonalityName } from '@/lib/personality';
import {
  type SocialLinkInput,
  normalizeSocialLinks,
} from '@/lib/social-platforms';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  category,
  link,
  payment,
  personalityClaim,
  personalityReport,
  socialLink,
  support,
  withdrawal,
} from '../schema';
import { invalidateProfileLinkCache } from './link';

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
  await invalidateProfileLinkCache(row.id);
  return { ok: true as const, personality: row };
};

type FicheFields = {
  name: string;
  categoryId: string | null;
  location: string | null;
  bio?: string;
  isPublic: boolean;
  socialLinks: SocialLinkInput[];
};

type FicheError = 'invalid-social' | 'slug-taken' | 'not-found';

// Everything the admin form needs to edit a fiche.
export const getPersonalityForAdmin = async (personalityId: string) => {
  const row = await db.query.link.findFirst({
    where: (table, { eq: equals }) => equals(table.id, personalityId),
    columns: {
      id: true,
      link: true,
      name: true,
      image: true,
      bio: true,
      location: true,
      categoryId: true,
      isPublic: true,
      claimStatus: true,
      verificationStatus: true,
    },
    with: {
      socialLinks: {
        columns: { platform: true, url: true },
        orderBy: (table, { asc }) => asc(table.sortOrder),
      },
    },
  });
  if (!row) {
    return null;
  }
  const { link: rowSlug, bio, ...rest } = row;
  return { ...rest, slug: rowSlug, bio: plainTextFromBio(bio) };
};

async function replaceSocialLinks(
  personalityId: string,
  links: { platform: string; url: string }[]
) {
  await db
    .delete(socialLink)
    .where(eq(socialLink.personalityId, personalityId));
  if (links.length > 0) {
    await db.insert(socialLink).values(
      links.map((item, index) => ({
        personalityId,
        platform: item.platform,
        url: item.url,
        sortOrder: index,
      }))
    );
  }
}

// A fiche created by the admin belongs to the admin account until the
// person claims it: unclaimed and unverified, so it cannot take donations.
export const createPersonalityFiche = async (
  input: FicheFields & { slug: string; ownerId: string }
): Promise<
  | { ok: true; personality: { id: string; slug: string } }
  | { ok: false; error: FicheError; index?: number }
> => {
  const socials = normalizeSocialLinks(input.socialLinks);
  if (!socials.ok) {
    return { ok: false, error: 'invalid-social', index: socials.index };
  }
  let created: { id: string; link: string } | undefined;
  try {
    [created] = await db
      .insert(link)
      .values({
        link: input.slug,
        name: input.name,
        userId: input.ownerId,
        categoryId: input.categoryId,
        location: input.location,
        bio: input.bio === undefined ? null : bioFromPlainText(input.bio),
        isPublic: input.isPublic,
        claimStatus: 'unclaimed',
        verificationStatus: 'unverified',
      })
      .returning({ id: link.id, link: link.link });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: 'slug-taken' };
    }
    throw error;
  }
  if (!created) {
    return { ok: false, error: 'not-found' };
  }
  try {
    await replaceSocialLinks(created.id, socials.links);
  } catch (error) {
    // No half-created fiche: drop it and let the admin retry.
    await db.delete(link).where(eq(link.id, created.id));
    throw error;
  }
  return { ok: true, personality: { id: created.id, slug: created.link } };
};

export const updatePersonalityFiche = async (
  input: FicheFields & { personalityId: string }
): Promise<
  | { ok: true; personality: { id: string; slug: string } }
  | { ok: false; error: FicheError; index?: number }
> => {
  const socials = normalizeSocialLinks(input.socialLinks);
  if (!socials.ok) {
    return { ok: false, error: 'invalid-social', index: socials.index };
  }
  const [updated] = await db
    .update(link)
    .set({
      name: input.name,
      categoryId: input.categoryId,
      location: input.location,
      isPublic: input.isPublic,
      ...(input.bio === undefined ? {} : { bio: bioFromPlainText(input.bio) }),
      updatedAt: new Date(),
    })
    .where(eq(link.id, input.personalityId))
    .returning({ id: link.id, link: link.link });
  if (!updated) {
    return { ok: false, error: 'not-found' };
  }
  await replaceSocialLinks(updated.id, socials.links);
  await invalidateProfileLinkCache(updated.id);
  return { ok: true, personality: { id: updated.id, slug: updated.link } };
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

// Pending requests first (oldest first: paid in order), or the reviewed
// ones (latest first).
export const listWithdrawalsForAdmin = async (status: 'pending' | 'done') => {
  const rows = await db.query.withdrawal.findMany({
    where: (table, { eq: equals, ne }) =>
      status === 'pending'
        ? equals(table.status, 'pending')
        : ne(table.status, 'pending'),
    columns: {
      id: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      status: true,
      payoutOperator: true,
      payoutPhone: true,
      payoutReference: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
    },
    with: {
      personality: { columns: { name: true, link: true } },
      requestedBy: { columns: { name: true, email: true } },
      reviewedBy: { columns: { name: true } },
    },
    orderBy: (table, { asc, desc: latest }) =>
      status === 'pending' ? asc(table.createdAt) : latest(table.updatedAt),
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
    await invalidateProfileLinkCache(report.personalityId);
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
