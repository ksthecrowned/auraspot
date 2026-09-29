import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { link } from './link';
import { user } from './user';

export const paymentStatuses = [
  'pending',
  'success',
  'failed',
  'cancelled',
  'refunded',
] as const;

export const ledgerEntryTypes = [
  'credit',
  'debit',
  'fee',
  'withdrawal',
] as const;

export const recurringSupportStatuses = ['active', 'cancelled'] as const;

export const recurringSupport = pgTable(
  'recurring_support',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    currency: text('currency').default('XAF').notNull(),
    displayName: text('display_name'),
    isPublic: boolean('is_public').default(false).notNull(),
    status: text('status', { enum: recurringSupportStatuses })
      .default('active')
      .notNull(),
    nextChargeAt: timestamp('next_charge_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('recurring_support_user_id_idx').on(table.userId),
    uniqueIndex('recurring_support_active_user_personality_idx')
      .on(table.userId, table.personalityId)
      .where(sql`${table.status} = 'active'`),
  ]
);

export const support = pgTable(
  'support',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    recurringSupportId: uuid('recurring_support_id').references(
      () => recurringSupport.id,
      { onDelete: 'set null' }
    ),
    amount: integer('amount').notNull(),
    currency: text('currency').default('XAF').notNull(),
    displayName: text('display_name'),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('support_personality_id_idx').on(table.personalityId),
    index('support_user_id_idx').on(table.userId),
    index('support_recurring_support_id_idx').on(table.recurringSupportId),
  ]
);

export const payment = pgTable(
  'payment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    supportId: uuid('support_id')
      .notNull()
      .references(() => support.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerReference: text('provider_reference').notNull().unique(),
    status: text('status', { enum: paymentStatuses })
      .default('pending')
      .notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').default('XAF').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('payment_support_id_idx').on(table.supportId)]
);

export const paymentEvent = pgTable('payment_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),
  providerReference: text('provider_reference').notNull(),
  status: text('status', { enum: paymentStatuses }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const ledgerEntry = pgTable(
  'ledger_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    supportId: uuid('support_id').references(() => support.id, {
      onDelete: 'set null',
    }),
    paymentId: uuid('payment_id').references(() => payment.id, {
      onDelete: 'set null',
    }),
    withdrawalId: uuid('withdrawal_id'),
    entryType: text('entry_type', { enum: ledgerEntryTypes }).notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').default('XAF').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('ledger_entry_personality_id_idx').on(table.personalityId),
    index('ledger_entry_withdrawal_id_idx').on(table.withdrawalId),
  ]
);

export const withdrawal = pgTable(
  'withdrawal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalityId: uuid('personality_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    requestedByUserId: text('requested_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    grossAmount: integer('gross_amount').notNull(),
    commissionBps: integer('commission_bps').notNull(),
    commissionAmount: integer('commission_amount').notNull(),
    netAmount: integer('net_amount').notNull(),
    currency: text('currency').default('XAF').notNull(),
    status: text('status', { enum: paymentStatuses })
      .default('pending')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('withdrawal_personality_id_idx').on(table.personalityId),
    index('withdrawal_requested_by_user_id_idx').on(table.requestedByUserId),
  ]
);

export const recurringSupportRelations = relations(
  recurringSupport,
  ({ one, many }) => ({
    personality: one(link, {
      fields: [recurringSupport.personalityId],
      references: [link.id],
    }),
    user: one(user, {
      fields: [recurringSupport.userId],
      references: [user.id],
    }),
    supports: many(support),
  })
);

export const supportRelations = relations(support, ({ one, many }) => ({
  personality: one(link, {
    fields: [support.personalityId],
    references: [link.id],
  }),
  user: one(user, {
    fields: [support.userId],
    references: [user.id],
  }),
  recurringSupport: one(recurringSupport, {
    fields: [support.recurringSupportId],
    references: [recurringSupport.id],
  }),
  payments: many(payment),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  support: one(support, {
    fields: [payment.supportId],
    references: [support.id],
  }),
}));

export const withdrawalRelations = relations(withdrawal, ({ one }) => ({
  personality: one(link, {
    fields: [withdrawal.personalityId],
    references: [link.id],
  }),
  requestedBy: one(user, {
    fields: [withdrawal.requestedByUserId],
    references: [user.id],
  }),
}));
