import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { category } from './category';
import { link } from './link';
import { linkClick } from './link-click';
import { linkView } from './link-view';
import { support } from './support';
import { user } from './user';

export const managerRoles = ['owner', 'manager'] as const;

export const claimRelationships = ['self', 'representative'] as const;

export const claimReviewStatuses = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'MORE_INFORMATION_REQUIRED',
] as const;

export const socialLink = pgTable(
  'social_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    url: text('url').notNull(),
    label: text('label'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('social_link_personality_id_idx').on(table.personalityId)]
);

export const personalityManager = pgTable(
  'personality_manager',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: managerRoles }).default('manager').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('personality_manager_personality_user_unique').on(
      table.personalityId,
      table.userId
    ),
    index('personality_manager_user_id_idx').on(table.userId),
  ]
);

export const personalityClaim = pgTable(
  'personality_claim',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    relationship: text('relationship', {
      enum: claimRelationships,
    }).notNull(),
    statement: text('statement').notNull(),
    evidenceUrls: json('evidence_urls').$type<string[]>().default([]).notNull(),
    status: text('status', { enum: claimReviewStatuses })
      .default('PENDING')
      .notNull(),
    reviewNote: text('review_note'),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('personality_claim_personality_id_idx').on(table.personalityId),
    index('personality_claim_user_id_idx').on(table.userId),
    index('personality_claim_status_idx').on(table.status),
  ]
);

export const reportReasons = [
  'impersonation',
  'inappropriate',
  'inappropriate_message',
  'other',
] as const;

export const reportStatuses = ['open', 'dismissed', 'resolved'] as const;

export const personalityReport = pgTable(
  'personality_report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    reporterUserId: text('reporter_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reason: text('reason', { enum: reportReasons }).notNull(),
    details: text('details').notNull(),
    supportId: uuid('support_id').references(() => support.id, {
      onDelete: 'set null',
    }),
    status: text('status', { enum: reportStatuses }).default('open').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('personality_report_personality_id_idx').on(table.personalityId),
    index('personality_report_status_idx').on(table.status),
  ]
);

export const linkRelations = relations(link, ({ one, many }) => ({
  user: one(user, {
    fields: [link.userId],
    references: [user.id],
  }),
  category: one(category, {
    fields: [link.categoryId],
    references: [category.id],
  }),
  views: many(linkView),
  clicks: many(linkClick),
  socialLinks: many(socialLink),
  managers: many(personalityManager),
  claims: many(personalityClaim),
  reports: many(personalityReport),
}));

export const socialLinkRelations = relations(socialLink, ({ one }) => ({
  personality: one(link, {
    fields: [socialLink.personalityId],
    references: [link.id],
  }),
}));

export const personalityManagerRelations = relations(
  personalityManager,
  ({ one }) => ({
    personality: one(link, {
      fields: [personalityManager.personalityId],
      references: [link.id],
    }),
    user: one(user, {
      fields: [personalityManager.userId],
      references: [user.id],
      relationName: 'personalityManager',
    }),
  })
);

export const personalityReportRelations = relations(
  personalityReport,
  ({ one }) => ({
    personality: one(link, {
      fields: [personalityReport.personalityId],
      references: [link.id],
    }),
    reporter: one(user, {
      fields: [personalityReport.reporterUserId],
      references: [user.id],
    }),
    support: one(support, {
      fields: [personalityReport.supportId],
      references: [support.id],
    }),
  })
);

export const personalityClaimRelations = relations(
  personalityClaim,
  ({ one }) => ({
    personality: one(link, {
      fields: [personalityClaim.personalityId],
      references: [link.id],
    }),
    user: one(user, {
      fields: [personalityClaim.userId],
      references: [user.id],
      relationName: 'claimant',
    }),
    reviewedBy: one(user, {
      fields: [personalityClaim.reviewedByUserId],
      references: [user.id],
      relationName: 'claimReviewer',
    }),
  })
);
