import { SOCIAL_PLATFORMS } from '@/lib/social-platforms';
import { BentoSchema, ValidLinkSchema } from '@/types';
import * as z from 'zod';

export const LinkAvailableSchema = z.object({
  link: z.string().toLowerCase(),
});

export const CreateLinkSchema = z.object({
  link: ValidLinkSchema,
  name: z.string().optional(),
  bio: z.string().optional(),
  // Handles or links, turned into link blocks (see src/lib/social-platforms).
  socials: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        value: z.string().trim().max(300),
      })
    )
    .max(SOCIAL_PLATFORMS.length)
    .default([]),
});

export const GetByLinkSchema = z.object({
  link: z.string(),
  src: z.string().max(32).optional(),
});

export const GetLinkViewsSchema = z.object({
  id: z.string(),
});

export const UpdateLinkSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  bio: z.string().optional(),
  theme: z.string().optional(),
  accentColor: z.string().nullable().optional(),
  darkMode: z.boolean().optional(),
  customDomain: z.string().nullable().optional(),
  customFooter: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const DeleteLinkSchema = z.object({
  link: z.string(),
});

export const CreateLinkBentoSchema = z.object({
  link: z.string(),
  bento: BentoSchema,
});

export const DeleteLinkBentoSchema = z.object({
  link: z.string(),
  id: z.string(),
});

export const UpdateLinkBentoSchema = z.object({
  link: z.string(),
  bento: BentoSchema,
});

export const UpdateLinkDetailsSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  location: z.string().trim().max(80).nullable(),
});
