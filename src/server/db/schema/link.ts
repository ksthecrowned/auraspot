import type { BentoSchema } from '@/types';
export { PositionSchema, SizeSchema, BentoSchema } from '@/types';
import {
  boolean,
  index,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type * as z from 'zod';
import { category } from './category';

export const linkClaimStatuses = ['unclaimed', 'claimed'] as const;
export const linkVerificationStatuses = ['unverified', 'verified'] as const;
export const linkPublicationStatuses = ['active', 'suspended'] as const;

export const link = pgTable(
  'link',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    link: text('link').unique().notNull(),

    image: text('image'),
    name: text('name').notNull(),
    bio: text('bio'),

    bento: json('bento')
      .$type<z.infer<typeof BentoSchema>[]>()
      .default([])
      .notNull(),

    customDomain: text('custom_domain').unique(),

    theme: text('theme').default('default').notNull(),
    accentColor: text('accent_color'),
    darkMode: boolean('dark_mode').default(false).notNull(),

    customFooter: text('custom_footer'),

    isPublic: boolean('is_public').default(true).notNull(),

    location: text('location'),
    categoryId: uuid('category_id').references(() => category.id, {
      onDelete: 'set null',
    }),
    claimStatus: text('claim_status', { enum: linkClaimStatuses })
      .default('claimed')
      .notNull(),
    verificationStatus: text('verification_status', {
      enum: linkVerificationStatuses,
    })
      .default('unverified')
      .notNull(),
    founderSince: timestamp('founder_since', { withTimezone: true }),
    status: text('publication_status', { enum: linkPublicationStatuses })
      .default('active')
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    userId: text('user_id').notNull(),
  },
  (table) => [
    index('link_category_id_idx').on(table.categoryId),
    index('link_publication_status_idx').on(table.status),
  ]
);
