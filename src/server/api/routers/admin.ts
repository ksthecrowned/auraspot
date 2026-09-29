import { adminProcedure, createTRPCRouter } from '@/server/api/trpc';
import {
  createCategory,
  getAdminOverview,
  listCategoriesForAdmin,
  listPaymentsForAdmin,
  listPersonalitiesForAdmin,
  listReportsForAdmin,
  listWithdrawalsForAdmin,
  reviewPersonalityReport,
  setPersonalityPublication,
  updateCategory,
} from '@/server/db/utils/admin';
import {
  listClaimsForReview,
  reviewPersonalityClaim,
  setPersonalityVerification,
} from '@/server/db/utils/personality';
import { TRPCError } from '@trpc/server';
import {
  AdminPersonalitySearchSchema,
  CreateCategorySchema,
  ReviewPersonalityReportSchema,
  SetPersonalityPublicationSchema,
  UpdateCategorySchema,
} from '../schemas/admin';
import {
  ReviewPersonalityClaimSchema,
  SetPersonalityVerificationSchema,
} from '../schemas/personality';

export const adminRouter = createTRPCRouter({
  overview: adminProcedure.query(() => {
    return getAdminOverview();
  }),

  personalities: adminProcedure
    .input(AdminPersonalitySearchSchema)
    .query(({ input }) => {
      return listPersonalitiesForAdmin(input.query);
    }),

  setPublication: adminProcedure
    .input(SetPersonalityPublicationSchema)
    .mutation(async ({ input }) => {
      const result = await setPersonalityPublication(input);
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return result.personality;
    }),

  categories: adminProcedure.query(() => {
    return listCategoriesForAdmin();
  }),

  createCategory: adminProcedure
    .input(CreateCategorySchema)
    .mutation(async ({ input }) => {
      const result = await createCategory(input.name);
      if (!result.ok) {
        throw new TRPCError({
          code: result.error === 'slug-taken' ? 'CONFLICT' : 'BAD_REQUEST',
          message:
            result.error === 'slug-taken'
              ? 'Une catégorie porte déjà ce nom.'
              : 'Ce nom de catégorie n’est pas valide.',
        });
      }
      return result.category;
    }),

  updateCategory: adminProcedure
    .input(UpdateCategorySchema)
    .mutation(async ({ input }) => {
      const result = await updateCategory(input);
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette catégorie est introuvable.',
        });
      }
      return result.category;
    }),

  payments: adminProcedure.query(() => {
    return listPaymentsForAdmin();
  }),

  withdrawals: adminProcedure.query(() => {
    return listWithdrawalsForAdmin();
  }),

  reports: adminProcedure.query(() => {
    return listReportsForAdmin();
  }),

  reviewReport: adminProcedure
    .input(ReviewPersonalityReportSchema)
    .mutation(async ({ input }) => {
      const result = await reviewPersonalityReport(input);
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ce signalement est introuvable.',
        });
      }
      return result.report;
    }),

  claims: adminProcedure.query(() => {
    return listClaimsForReview();
  }),

  reviewClaim: adminProcedure
    .input(ReviewPersonalityClaimSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await reviewPersonalityClaim({
        reviewerId: ctx.user.id,
        claimId: input.claimId,
        decision: input.decision,
        reviewNote: input.reviewNote,
      });
      if ('error' in result) {
        if (result.error === 'already-reviewed') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Cette demande a déjà été traitée.',
          });
        }
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette demande est introuvable.',
        });
      }
      return result.claim;
    }),

  setVerification: adminProcedure
    .input(SetPersonalityVerificationSchema)
    .mutation(async ({ input }) => {
      const result = await setPersonalityVerification(input);
      if ('error' in result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return result.personality;
    }),
});
