import * as z from 'zod';

export const PersonalitySlugSchema = z.object({
  slug: z.string(),
});

const HttpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  });

export const CreatePersonalityClaimSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  relationship: z.enum(['self', 'representative']),
  statement: z.string().trim().min(20).max(1000),
  evidenceUrls: z.array(HttpUrlSchema).min(1).max(5),
});

export const ReviewPersonalityClaimSchema = z
  .object({
    claimId: z.string().uuid(),
    decision: z.enum(['APPROVED', 'REJECTED', 'MORE_INFORMATION_REQUIRED']),
    reviewNote: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal(''))
      .transform((value) => value || undefined),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'APPROVED') {
      return;
    }
    if (!value.reviewNote || value.reviewNote.length < 10) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expliquez la décision en au moins 10 caractères.',
        path: ['reviewNote'],
      });
    }
  });

export const SetPersonalityVerificationSchema = z.object({
  personalityId: z.string().uuid(),
  verified: z.boolean(),
});

const optionalSearchText = z
  .string()
  .trim()
  .max(80)
  .optional()
  .or(z.literal(''))
  .transform((value) => value || undefined);

export const SearchPersonalitiesSchema = z.object({
  query: optionalSearchText,
  categorySlug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  location: optionalSearchText,
  limit: z.number().int().min(1).max(48).default(24),
});
