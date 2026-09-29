import {
  generalLimit,
  personalityClaimLimit,
  personalityReportLimit,
} from '@/lib/ratelimit';
import {
  createProtectedRateLimitedProcedure,
  createRateLimitedProcedure,
  createTRPCRouter,
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
import { TRPCError } from '@trpc/server';
import { CreatePersonalityReportSchema } from '../schemas/admin';
import {
  CreatePersonalityClaimSchema,
  PersonalitySlugSchema,
  SearchPersonalitiesSchema,
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
});
