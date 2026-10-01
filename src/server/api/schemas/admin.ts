import { SOCIAL_PLATFORMS } from '@/lib/social-platforms';
import { ValidLinkSchema } from '@/types';
import * as z from 'zod';

export const AdminPersonalitySearchSchema = z.object({
  query: z.string().trim().max(80).optional(),
});

export const SetPersonalityPublicationSchema = z.object({
  personalityId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
});

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(2).max(40),
});

export const UpdateCategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(40),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export const CreatePersonalityReportSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  reason: z.enum(['impersonation', 'inappropriate', 'other']),
  details: z.string().trim().min(10).max(2000),
});

export const ReviewPersonalityReportSchema = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(['dismissed', 'suspend']),
});

const FicheFieldsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: z.string().uuid().nullable(),
  location: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || null),
  // Plain text; sent only when edited so the owner's formatting is kept.
  bio: z.string().max(1000).optional(),
  isPublic: z.boolean(),
  socialLinks: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        value: z.string().trim().max(300),
      })
    )
    .max(SOCIAL_PLATFORMS.length),
});

export const CreatePersonalitySchema = FicheFieldsSchema.extend({
  slug: ValidLinkSchema,
});

export const UpdatePersonalitySchema = FicheFieldsSchema.extend({
  personalityId: z.string().uuid(),
});

export const AdminPersonalityIdSchema = z.object({
  personalityId: z.string().uuid(),
});

// Paid needs the MoMo/Airtel transfer reference, to find the transfer again;
// refused needs a reason, sent to the person in the email.
export const ReviewWithdrawalSchema = z
  .object({
    withdrawalId: z.string().uuid(),
    decision: z.enum(['paid', 'refused']),
    reference: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'paid' && (value.reference?.length ?? 0) < 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indiquez la référence du transfert.',
        path: ['reference'],
      });
    }
    if (value.decision === 'refused' && (value.note?.length ?? 0) < 5) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expliquez le refus en quelques mots.',
        path: ['note'],
      });
    }
  });

export const AdminWithdrawalsSchema = z.object({
  status: z.enum(['pending', 'done']).default('pending'),
});
