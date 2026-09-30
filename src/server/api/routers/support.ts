import { generalLimit, supportCreateLimit } from '@/lib/ratelimit';
import {
  createProtectedRateLimitedProcedure,
  createRateLimitedProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';
import { renewDuePlans } from '@/server/db/utils/recurring';
import {
  cancelRecurringSupport,
  createSupportCheckout,
  getCheckout,
  getSupportPage,
  getSupporterHistory,
  getWithdrawalPage,
  requestWithdrawal,
  setSupportVisibility,
  startMobileMoneyPayment,
  syncMobileMoneyPayment,
} from '@/server/db/utils/support';
import { TRPCError } from '@trpc/server';
import {
  CancelRecurringSupportSchema,
  CheckoutPaymentSchema,
  CreateSupportSchema,
  PayCheckoutSchema,
  RequestWithdrawalSchema,
  SetSupportVisibilitySchema,
  SupportSlugSchema,
} from '../schemas/support';

const rateLimitedSupport = createRateLimitedProcedure(supportCreateLimit);
const PAY_ERRORS = {
  'not-payable': 'Ce paiement a déjà été lancé.',
  'not-configured': 'Cet opérateur n’est pas disponible pour ce pays.',
  'invalid-phone': 'Ce numéro de téléphone n’est pas valide.',
  'operator-refused':
    'L’opérateur a refusé la demande. Vérifiez le numéro et réessayez avec un nouveau don.',
} as const;

const rateLimitedPolling = createRateLimitedProcedure(generalLimit);
const rateLimitedWithdrawal =
  createProtectedRateLimitedProcedure(supportCreateLimit);

export const supportRouter = createTRPCRouter({
  page: publicProcedure.input(SupportSlugSchema).query(({ input }) => {
    return getSupportPage(input.slug);
  }),

  create: rateLimitedSupport
    .input(CreateSupportSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await createSupportCheckout({
        slug: input.slug,
        amount: input.amount,
        displayName: input.displayName,
        isPublic: input.isPublic,
        userId: ctx.session?.user?.id ?? null,
        interval: input.interval,
      });
      if ('error' in result) {
        if (result.error === 'invalid-amount') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ce montant n’est pas accepté.',
          });
        }
        if (result.error === 'account-required') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Un compte est nécessaire pour un soutien mensuel.',
          });
        }
        if (result.error === 'already-active') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Un soutien mensuel est déjà actif pour cette fiche.',
          });
        }
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return result;
    }),

  checkout: publicProcedure.input(CheckoutPaymentSchema).query(({ input }) => {
    return getCheckout(input.paymentId);
  }),

  pay: rateLimitedSupport
    .input(PayCheckoutSchema)
    .mutation(async ({ input }) => {
      const result = await startMobileMoneyPayment(input);
      if ('error' in result) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: PAY_ERRORS[result.error ?? 'operator-refused'],
        });
      }
      return result;
    }),

  // Polled by the checkout page while the payer approves on their phone.
  syncCheckout: rateLimitedPolling
    .input(CheckoutPaymentSchema)
    .mutation(async ({ input }) => {
      const status = await syncMobileMoneyPayment({
        paymentId: input.paymentId,
      }).catch(() => 'pending' as const);
      if (!status) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Paiement introuvable.',
        });
      }
      return { status };
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    await renewDuePlans({ userId: ctx.user.id });
    return getSupporterHistory(ctx.user.id);
  }),

  setVisibility: protectedProcedure
    .input(SetSupportVisibilitySchema)
    .mutation(async ({ ctx, input }) => {
      const result = await setSupportVisibility({
        userId: ctx.user.id,
        supportId: input.supportId,
        isPublic: input.isPublic,
      });
      if ('error' in result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ce soutien est introuvable.',
        });
      }
      return result.support;
    }),

  cancelRecurring: protectedProcedure
    .input(CancelRecurringSupportSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await cancelRecurringSupport({
        userId: ctx.user.id,
        recurringSupportId: input.recurringSupportId,
      });
      if ('error' in result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ce soutien mensuel est introuvable.',
        });
      }
      return result.recurringSupport;
    }),

  withdrawalPage: protectedProcedure
    .input(SupportSlugSchema)
    .query(async ({ ctx, input }) => {
      const result = await getWithdrawalPage(input.slug, ctx.user.id);
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      if ('forbidden' in result) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return result;
    }),

  requestWithdrawal: rateLimitedWithdrawal
    .input(RequestWithdrawalSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await requestWithdrawal({
        slug: input.slug,
        userId: ctx.user.id,
        grossAmount: input.grossAmount,
      });
      if ('error' in result) {
        if (result.error === 'forbidden') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (result.error === 'invalid-amount') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ce montant dépasse le solde disponible.',
          });
        }
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cette fiche est introuvable.',
        });
      }
      return result.withdrawal;
    }),
});
