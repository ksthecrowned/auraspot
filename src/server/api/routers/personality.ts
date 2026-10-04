import {
  generalLimit,
  personalityClaimLimit,
  personalityReportLimit,
} from '@/lib/ratelimit';
import {
  createProtectedRateLimitedProcedure,
  createRateLimitedProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';
import { createPersonalityReport } from '@/server/db/utils/admin';
import {
  getClaimPageContext,
  getPublicPersonalityBySlug,
  listActiveCategories,
  searchPublicPersonalities,
  submitPersonalityClaim,
} from '@/server/db/utils/personality';
import {
  closeSupportGoal,
  createSupportGoal,
  getGoalTotal,
  getPublicGoal,
  personalityIdForSlug,
} from '@/server/db/utils/support-goal';
import { TRPCError } from '@trpc/server';
import { CreatePersonalityReportSchema } from '../schemas/admin';
import {
  CreatePersonalityClaimSchema,
  CreateSupportGoalSchema,
  PersonalitySlugSchema,
  SearchPersonalitiesSchema,
  SupportGoalSlugSchema,
} from '../schemas/personality';

const rateLimitedSearch = createRateLimitedProcedure(generalLimit);
const rateLimitedClaim = createProtectedRateLimitedProcedure(
  personalityClaimLimit
);
const rateLimitedReport = createRateLimitedProcedure(personalityReportLimit);

export const personalityRouter = createTRPCRouter({
  categories: publicProcedure.query(() => {
    return listActiveCategories();
  }),

  getBySlug: publicProcedure.input(PersonalitySlugSchema).query(({ input }) => {
    return getPublicPersonalityBySlug(input.slug);
  }),

  search: rateLimitedSearch
    .input(SearchPersonalitiesSchema)
    .query(({ input }) => {
      return searchPublicPersonalities(input);
    }),

  claimContext: publicProcedure
    .input(PersonalitySlugSchema)
    .query(({ ctx, input }) => {
      return getClaimPageContext(input.slug, ctx.session?.user?.id ?? null);
    }),

  submitClaim: rateLimitedClaim
    .input(CreatePersonalityClaimSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await submitPersonalityClaim({
        userId: ctx.user.id,
        slug: input.slug,
        relationship: input.relationship,
        statement: input.statement,
        evidenceUrls: input.evidenceUrls,
      });

      if ('error' in result) {
        if (result.error === 'not-found') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cette fiche est introuvable.',
          });
        }
        if (result.error === 'already-manager') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Vous gérez déjà cette fiche.',
          });
        }
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Une demande est déjà en attente pour cette fiche.',
        });
      }

      return result.claim;
    }),

  report: rateLimitedReport
    .input(CreatePersonalityReportSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await createPersonalityReport({
        slug: input.slug,
        reason: input.reason,
        details: input.details,
        supportId: input.supportId,
        reporterUserId: ctx.session?.user?.id ?? null,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return result.report;
    }),

  goal: publicProcedure
    .input(PersonalitySlugSchema)
    .query(async ({ input }) => {
      const personalityId = await personalityIdForSlug(input.slug);
      if (!personalityId) {
        return null;
      }
      return getPublicGoal(personalityId);
    }),

  createGoal: protectedProcedure
    .input(CreateSupportGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const endsAt = input.endsAt
        ? new Date(`${input.endsAt}T23:59:59.000Z`)
        : undefined;
      if (endsAt && endsAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La date de fin est déjà passée.',
        });
      }
      const result = await createSupportGoal({
        userId: ctx.user.id,
        slug: input.slug,
        title: input.title,
        description: input.description,
        targetAmount: input.targetAmount,
        endsAt,
      });
      if ('error' in result) {
        if (result.error === 'already-active') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Un objectif est déjà en cours.',
          });
        }
        if (result.error === 'forbidden') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (result.error === 'not-eligible') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cette fiche ne peut pas encore recevoir de dons.',
          });
        }
        if (result.error === 'invalid-amount') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Le montant cible va de 10 000 à 50 000 000 FCFA.',
          });
        }
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return result;
    }),

  closeGoal: protectedProcedure
    .input(SupportGoalSlugSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await closeSupportGoal({
        userId: ctx.user.id,
        slug: input.slug,
      });
      if ('error' in result) {
        throw new TRPCError({
          code: result.error === 'forbidden' ? 'FORBIDDEN' : 'NOT_FOUND',
          message:
            result.error === 'forbidden'
              ? 'Vous ne pouvez pas clôturer cet objectif.'
              : 'Aucun objectif en cours.',
        });
      }
      return result;
    }),

  goalTotal: protectedProcedure
    .input(SupportGoalSlugSchema)
    .query(async ({ ctx, input }) => {
      const result = await getGoalTotal({
        userId: ctx.user.id,
        slug: input.slug,
      });
      if ('error' in result) {
        throw new TRPCError({
          code: result.error === 'forbidden' ? 'FORBIDDEN' : 'NOT_FOUND',
        });
      }
      return result;
    }),
});
