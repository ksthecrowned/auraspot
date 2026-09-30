import { MAX_SUPPORT_AMOUNT, MIN_SUPPORT_AMOUNT } from '@/lib/money';
import * as z from 'zod';

export const SupportSlugSchema = z.object({
  slug: z.string().trim().min(1).max(80),
});

export const CreateSupportSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  amount: z.number().int().min(MIN_SUPPORT_AMOUNT).max(MAX_SUPPORT_AMOUNT),
  displayName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  isPublic: z.boolean().default(false),
  interval: z.enum(['once', 'month']).default('once'),
});

export const SetSupportVisibilitySchema = z.object({
  supportId: z.string().uuid(),
  isPublic: z.boolean(),
});

export const CancelRecurringSupportSchema = z.object({
  recurringSupportId: z.string().uuid(),
});

export const CheckoutPaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

export const PayCheckoutSchema = z.object({
  paymentId: z.string().uuid(),
  operator: z.enum(['mtn_momo', 'airtel_money']),
  country: z.string().length(2),
  // Validated per country by toMsisdn() (src/lib/phone-countries.ts).
  phone: z.string().trim().min(6).max(24),
});

export const RequestWithdrawalSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  grossAmount: z.number().int().min(MIN_SUPPORT_AMOUNT).max(MAX_SUPPORT_AMOUNT),
});

export const PaymentWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  providerReference: z.string().trim().min(1).max(200),
  status: z.enum(['success', 'failed', 'cancelled', 'refunded']),
});

export const PayoutWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  withdrawalId: z.string().uuid(),
  status: z.enum(['success', 'failed', 'cancelled', 'refunded']),
});
