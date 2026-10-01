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
