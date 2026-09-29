import { eq } from 'drizzle-orm';
import { db } from '../db';
import { link, personalityClaim, personalityManager } from '../schema';
import { invalidateProfileLinkCache } from './link';

function withSlug<T extends { link: string }>(row: T) {
  return { ...row, slug: row.link };
}

const LIKE_SPECIAL_RE = /[%_\\]/g;

function escapeLike(value: string) {
  return value.replace(LIKE_SPECIAL_RE, '\\$&');
}

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

export const getPublicPersonalityBySlug = async (slug: string) => {
  const row = await db.query.link.findFirst({
    where: (table, { and, eq }) =>
      and(
        eq(table.link, slug),
        eq(table.status, 'active'),
        eq(table.isPublic, true)
      ),
    columns: {
      id: true,
      link: true,
      name: true,
      image: true,
      bio: true,
      location: true,
      claimStatus: true,
      verificationStatus: true,
    },
    with: {
      category: {
        columns: { name: true, slug: true },
      },
      socialLinks: {
        columns: { id: true, platform: true, url: true, label: true },
        orderBy: (table, { asc }) => asc(table.sortOrder),
      },
    },
  });

  return row ? withSlug(row) : null;
};

export const getProfileDetails = async (linkId: string) => {
  const row = await db.query.link.findFirst({
    where: (table, { eq: equals }) => equals(table.id, linkId),
    columns: { id: true },
    with: {
      category: { columns: { id: true, name: true, slug: true } },
      socialLinks: {
        columns: {
          id: true,
          platform: true,
          url: true,
          label: true,
          sortOrder: true,
        },
        orderBy: (table, { asc }) => asc(table.sortOrder),
      },
    },
  });

  return {
    category: row?.category ?? null,
    socialLinks: row?.socialLinks ?? [],
  };
};

export const searchPublicPersonalities = async (input: {
  query?: string;
  categorySlug?: string;
  location?: string;
  limit: number;
}) => {
  let categoryId: string | undefined;
  if (input.categorySlug) {
    const category = await db.query.category.findFirst({
      where: (row, { and, eq: equals }) =>
        and(
          equals(row.slug, input.categorySlug ?? ''),
          equals(row.isActive, true)
        ),
      columns: { id: true },
    });
    if (!category) {
      return [];
    }
    categoryId = category.id;
  }

  const rows = await db.query.link.findMany({
    where: (table, { and, eq: equals, ilike }) => {
      const filters = [
        equals(table.status, 'active'),
        equals(table.isPublic, true),
      ];
      if (categoryId) {
        filters.push(equals(table.categoryId, categoryId));
      }
      if (input.query) {
        filters.push(ilike(table.name, `%${escapeLike(input.query)}%`));
      }
      if (input.location) {
        filters.push(ilike(table.location, `%${escapeLike(input.location)}%`));
      }
      return and(...filters);
    },
    columns: {
      id: true,
      link: true,
      name: true,
      image: true,
      bio: true,
      location: true,
      verificationStatus: true,
      createdAt: true,
    },
    with: {
      category: {
        columns: { name: true, slug: true },
      },
    },
    orderBy: (table, { asc, desc }) => [desc(table.createdAt), asc(table.name)],
    limit: input.limit,
  });

  return rows.map((row) => withSlug(row));
};

const OPEN_CLAIM_STATUSES = ['PENDING', 'MORE_INFORMATION_REQUIRED'] as const;

export const getClaimPageContext = async (
  slug: string,
  userId: string | null
) => {
  const row = await db.query.link.findFirst({
    where: (table, { and, eq: equals }) =>
      and(
        equals(table.link, slug),
        equals(table.status, 'active'),
        equals(table.isPublic, true)
      ),
    columns: {
      id: true,
      link: true,
      name: true,
      image: true,
      claimStatus: true,
      userId: true,
    },
  });
  if (!row) {
    return null;
  }

  const personality = withSlug(row);
  const { userId: ownerId, ...publicPersonality } = personality;

  if (!userId) {
    return {
      personality: publicPersonality,
      signedIn: false as const,
      isManager: false,
      claim: null,
    };
  }

  const [manager, claim] = await Promise.all([
    db.query.personalityManager.findFirst({
      where: (table, { and, eq: equals }) =>
        and(equals(table.personalityId, row.id), equals(table.userId, userId)),
      columns: { id: true },
    }),
    db.query.personalityClaim.findFirst({
      where: (table, { and, eq: equals }) =>
        and(equals(table.personalityId, row.id), equals(table.userId, userId)),
      columns: {
        id: true,
        relationship: true,
        statement: true,
        evidenceUrls: true,
        status: true,
        reviewNote: true,
        createdAt: true,
      },
      orderBy: (table, { desc }) => desc(table.createdAt),
    }),
  ]);

  return {
    personality: publicPersonality,
    signedIn: true as const,
    isManager: Boolean(manager) || ownerId === userId,
    claim: claim ?? null,
  };
};

export const submitPersonalityClaim = async (input: {
  userId: string;
  slug: string;
  relationship: 'self' | 'representative';
  statement: string;
  evidenceUrls: string[];
}) => {
  const row = await db.query.link.findFirst({
    where: (table, { and, eq: equals }) =>
      and(
        equals(table.link, input.slug),
        equals(table.status, 'active'),
        equals(table.isPublic, true)
      ),
    columns: { id: true, userId: true },
  });
  if (!row) {
    return { error: 'not-found' as const };
  }

  if (row.userId === input.userId) {
    return { error: 'already-manager' as const };
  }

  const manager = await db.query.personalityManager.findFirst({
    where: (table, { and, eq: equals }) =>
      and(
        equals(table.personalityId, row.id),
        equals(table.userId, input.userId)
      ),
    columns: { id: true },
  });
  if (manager) {
    return { error: 'already-manager' as const };
  }

  const openClaim = await db.query.personalityClaim.findFirst({
    where: (table, { and, eq: equals, inArray }) =>
      and(
        equals(table.personalityId, row.id),
        equals(table.userId, input.userId),
        inArray(table.status, [...OPEN_CLAIM_STATUSES])
      ),
    columns: { id: true, status: true },
    orderBy: (table, { desc }) => desc(table.createdAt),
  });

  if (openClaim?.status === 'PENDING') {
    return { error: 'claim-open' as const };
  }

  if (openClaim?.status === 'MORE_INFORMATION_REQUIRED') {
    const updated = await db
      .update(personalityClaim)
      .set({
        relationship: input.relationship,
        statement: input.statement,
        evidenceUrls: input.evidenceUrls,
        status: 'PENDING',
        updatedAt: new Date(),
      })
      .where(eq(personalityClaim.id, openClaim.id))
      .returning({
        id: personalityClaim.id,
        status: personalityClaim.status,
      });
    const claim = updated[0];
    if (!claim) {
      return { error: 'claim-open' as const };
    }
    return { claim };
  }

  const inserted = await db
    .insert(personalityClaim)
    .values({
      personalityId: row.id,
      userId: input.userId,
      relationship: input.relationship,
      statement: input.statement,
      evidenceUrls: input.evidenceUrls,
      status: 'PENDING',
    })
    .returning({
      id: personalityClaim.id,
      status: personalityClaim.status,
    });
  const claim = inserted[0];
  if (!claim) {
    return { error: 'claim-open' as const };
  }
  return { claim };
};

export const listClaimsForReview = async () => {
  const rows = await db.query.personalityClaim.findMany({
    columns: {
      id: true,
      relationship: true,
      statement: true,
      evidenceUrls: true,
      status: true,
      reviewNote: true,
      createdAt: true,
    },
    with: {
      personality: {
        columns: {
          id: true,
          name: true,
          link: true,
          claimStatus: true,
          verificationStatus: true,
        },
      },
      user: {
        columns: { name: true, email: true },
      },
    },
    orderBy: (table, { desc }) => desc(table.createdAt),
    limit: 50,
  });

  const rank = {
    PENDING: 0,
    MORE_INFORMATION_REQUIRED: 1,
    APPROVED: 2,
    REJECTED: 3,
  } as const;

  return rows
    .map((row) => ({
      ...row,
      personality: {
        id: row.personality.id,
        name: row.personality.name,
        slug: row.personality.link,
        claimStatus: row.personality.claimStatus,
        verificationStatus: row.personality.verificationStatus,
      },
    }))
    .sort((left, right) => {
      const byStatus = rank[left.status] - rank[right.status];
      if (byStatus !== 0) {
        return byStatus;
      }
      return right.createdAt.getTime() - left.createdAt.getTime();
    });
};

async function grantPersonalityManagement(
  personalityId: string,
  userId: string
) {
  const [existingUserManager, anyManager] = await Promise.all([
    db.query.personalityManager.findFirst({
      where: (table, { and, eq: equals }) =>
        and(
          equals(table.personalityId, personalityId),
          equals(table.userId, userId)
        ),
      columns: { id: true },
    }),
    db.query.personalityManager.findFirst({
      where: (table, { eq: equals }) =>
        equals(table.personalityId, personalityId),
      columns: { id: true },
    }),
  ]);

  if (!existingUserManager) {
    try {
      await db.insert(personalityManager).values({
        personalityId,
        userId,
        role: anyManager ? 'manager' : 'owner',
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }

  await db
    .update(link)
    .set({
      claimStatus: 'claimed',
      updatedAt: new Date(),
    })
    .where(eq(link.id, personalityId));
  await invalidateProfileLinkCache(personalityId);
}

export const reviewPersonalityClaim = async (input: {
  reviewerId: string;
  claimId: string;
  decision: 'APPROVED' | 'REJECTED' | 'MORE_INFORMATION_REQUIRED';
  reviewNote?: string;
}) => {
  const claim = await db.query.personalityClaim.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.claimId),
    columns: {
      id: true,
      status: true,
      personalityId: true,
      userId: true,
    },
  });
  if (!claim) {
    return { error: 'not-found' as const };
  }
  if (claim.status === 'APPROVED' || claim.status === 'REJECTED') {
    return { error: 'already-reviewed' as const };
  }

  if (input.decision === 'APPROVED') {
    await grantPersonalityManagement(claim.personalityId, claim.userId);
  }

  const updated = await db
    .update(personalityClaim)
    .set({
      status: input.decision,
      reviewNote: input.reviewNote ?? null,
      reviewedByUserId: input.reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(personalityClaim.id, claim.id))
    .returning({
      id: personalityClaim.id,
      status: personalityClaim.status,
    });
  const reviewed = updated[0];
  if (!reviewed) {
    return { error: 'not-found' as const };
  }
  return { claim: reviewed };
};

export const setPersonalityVerification = async (input: {
  personalityId: string;
  verified: boolean;
}) => {
  const existing = await db.query.link.findFirst({
    where: (table, { and, eq: equals }) =>
      and(
        equals(table.id, input.personalityId),
        equals(table.status, 'active')
      ),
    columns: { id: true },
  });
  if (!existing) {
    return { error: 'not-found' as const };
  }

  const updated = await db
    .update(link)
    .set({
      verificationStatus: input.verified ? 'verified' : 'unverified',
      updatedAt: new Date(),
    })
    .where(eq(link.id, existing.id))
    .returning({
      id: link.id,
      verificationStatus: link.verificationStatus,
    });
  const row = updated[0];
  if (!row) {
    return { error: 'not-found' as const };
  }
  await invalidateProfileLinkCache(row.id);
  return { personality: row };
};

export const listActiveCategories = async () => {
  return db.query.category.findMany({
    where: (row, { eq }) => eq(row.isActive, true),
    columns: { id: true, name: true, slug: true },
    orderBy: (row, { asc }) => [asc(row.sortOrder), asc(row.name)],
  });
};
