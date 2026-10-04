# Drizzle Schema Guide

## Key Files
- Schema: `src/server/db/schema/`
- Client: `src/server/db/db.ts`
- Utils: `src/server/db/utils/`
- Config: `drizzle.config.ts`

## Tables
- user, session, account, verification (Better Auth; `user.emailDigest`)
- link (fiche, bento JSON, `claimStatus`, `verificationStatus`)
- link_view, link_click (analytics)
- email_subscriber
- category
- social_link, personality_manager, personality_claim (`personality.ts`)
- support, recurring_support, payment, payment_event, ledger_entry, withdrawal (`support.ts`)

## Workflow: Edit schema -> `bun run db:generate` -> `bun run db:push`
## Primary keys: text for Better Auth ids, uuid elsewhere
## Timestamps: always withTimezone: true
