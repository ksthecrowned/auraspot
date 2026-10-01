import { adminProcedure, createTRPCRouter } from '@/server/api/trpc';
import {
  createCategory,
  createPersonalityFiche,
  getAdminOverview,
  getPersonalityForAdmin,
  listCategoriesForAdmin,
  listPaymentsForAdmin,
  listPersonalitiesForAdmin,
  listReportsForAdmin,
  listWithdrawalsForAdmin,
  reviewPersonalityReport,
  setPersonalityPublication,
  updateCategory,
  updatePersonalityFiche,
} from '@/server/db/utils/admin';
import {
  listClaimsForReview,
  reviewPersonalityClaim,
  setPersonalityVerification,
} from '@/server/db/utils/personality';
import { reviewWithdrawal } from '@/server/db/utils/support';
import { TRPCError } from '@trpc/server';
import {
  AdminPersonalityIdSchema,
  AdminPersonalitySearchSchema,
  AdminWithdrawalsSchema,
  CreateCategorySchema,
  CreatePersonalitySchema,
  ReviewPersonalityReportSchema,
  ReviewWithdrawalSchema,
  SetPersonalityPublicationSchema,
  UpdateCategorySchema,
  UpdatePersonalitySchema,
} from '../schemas/admin';
import {
  ReviewPersonalityClaimSchema,
  SetPersonalityVerificationSchema,
} from '../schemas/personality';

function ficheError(result: {
  error: 'invalid-social' | 'slug-taken' | 'not-found';
  index?: number;
}) {
  if (result.error === 'invalid-social') {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: `Le réseau n° ${(result.index ?? 0) + 1} n’est pas valide ou est en double.`,
    });
  }
  if (result.error === 'slug-taken') {
    return new TRPCError({
      code: 'CONFLICT',
      message: 'Cette adresse est déjà prise.',
    });
  }
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'Cette fiche est introuvable.',
  });
}

export const adminRouter = createTRPCRouter({
  overview: adminProcedure.query(() => {
    return getAdminOverview();
  }),

  personalities: adminProcedure
    .input(AdminPersonalitySearchSchema)
    .query(({ input }) => {
      return listPersonalitiesForAdmin(input.query);
    }),

  personality: adminProcedure
    .input(AdminPersonalityIdSchema)
    .query(async ({ input }) => {
      const row = await getPersonalityForAdmin(input.personalityId);
      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return row;
    }),

  createPersonality: adminProcedure
    .input(CreatePersonalitySchema)
    .mutation(async ({ ctx, input }) => {
      const result = await createPersonalityFiche({
        ...input,
        ownerId: ctx.user.id,
      });
      if (!result.ok) {
        throw ficheError(result);
      }
      return result.personality;
    }),

  updatePersonality: adminProcedure
    .input(UpdatePersonalitySchema)
    .mutation(async ({ input }) => {
      const result = await updatePersonalityFiche(input);
      if (!result.ok) {
        throw ficheError(result);
      }
      return result.personality;
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

  withdrawals: adminProcedure
    .input(AdminWithdrawalsSchema)
    .query(({ input }) => {
      return listWithdrawalsForAdmin(input.status);
    }),

  reviewWithdrawal: adminProcedure
    .input(ReviewWithdrawalSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await reviewWithdrawal({
        withdrawalId: input.withdrawalId,
        reviewerId: ctx.user.id,
        decision: input.decision,
        reference: input.reference,
        note: input.note,
      });
      if ('error' in result) {
        if (result.error === 'invalid-transition') {
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
      return { ok: true };
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
