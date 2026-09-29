ALTER TABLE "link" ADD COLUMN IF NOT EXISTS "category_id" uuid;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN IF NOT EXISTS "location" text;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN IF NOT EXISTS "claim_status" text DEFAULT 'claimed' NOT NULL;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN IF NOT EXISTS "publication_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "link" DROP CONSTRAINT IF EXISTS "link_category_id_category_id_fk";--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_category_id_idx" ON "link" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_publication_status_idx" ON "link" USING btree ("publication_status");--> statement-breakpoint
UPDATE "link" AS l
SET
  "category_id" = p."category_id",
  "location" = p."location",
  "claim_status" = p."claim_status",
  "verification_status" = p."verification_status",
  "publication_status" = p."status"
FROM "personality" AS p
WHERE l."link" = p."slug";--> statement-breakpoint
INSERT INTO "link" (
  "id",
  "link",
  "name",
  "image",
  "bio",
  "user_id",
  "category_id",
  "location",
  "claim_status",
  "verification_status",
  "publication_status",
  "bento",
  "is_public"
)
SELECT
  p."id",
  p."slug",
  p."name",
  p."image",
  p."bio",
  p."created_by_user_id",
  p."category_id",
  p."location",
  p."claim_status",
  p."verification_status",
  p."status",
  '[]'::json,
  true
FROM "personality" AS p
WHERE p."created_by_user_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "link" AS l WHERE l."link" = p."slug"
  );--> statement-breakpoint
UPDATE "social_link" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "personality_manager" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "personality_claim" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "personality_report" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "support" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "recurring_support" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "ledger_entry" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
UPDATE "withdrawal" AS child
SET "personality_id" = l."id"
FROM "personality" AS p
JOIN "link" AS l ON l."link" = p."slug"
WHERE child."personality_id" = p."id"
  AND child."personality_id" <> l."id";--> statement-breakpoint
DELETE FROM "social_link" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "personality_manager" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "personality_claim" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "personality_report" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "ledger_entry" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "withdrawal" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "payment" AS payment_row
WHERE EXISTS (
  SELECT 1 FROM "support" AS child
  WHERE child."id" = payment_row."support_id"
    AND NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id")
);--> statement-breakpoint
DELETE FROM "support" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
DELETE FROM "recurring_support" AS child
WHERE NOT EXISTS (SELECT 1 FROM "link" AS l WHERE l."id" = child."personality_id");--> statement-breakpoint
ALTER TABLE "social_link" DROP CONSTRAINT IF EXISTS "social_link_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "personality_manager" DROP CONSTRAINT IF EXISTS "personality_manager_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "personality_claim" DROP CONSTRAINT IF EXISTS "personality_claim_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "personality_report" DROP CONSTRAINT IF EXISTS "personality_report_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "support" DROP CONSTRAINT IF EXISTS "support_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "recurring_support" DROP CONSTRAINT IF EXISTS "recurring_support_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "ledger_entry" DROP CONSTRAINT IF EXISTS "ledger_entry_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "withdrawal" DROP CONSTRAINT IF EXISTS "withdrawal_personality_id_personality_id_fk";--> statement-breakpoint
ALTER TABLE "social_link" ADD CONSTRAINT "social_link_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_manager" ADD CONSTRAINT "personality_manager_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_claim" ADD CONSTRAINT "personality_claim_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_report" ADD CONSTRAINT "personality_report_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_support" ADD CONSTRAINT "recurring_support_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP TABLE IF EXISTS "personality";
