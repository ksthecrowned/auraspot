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
