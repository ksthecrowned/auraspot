ALTER TABLE "recurring_support" ADD COLUMN IF NOT EXISTS "payer_operator" text;--> statement-breakpoint
ALTER TABLE "recurring_support" ADD COLUMN IF NOT EXISTS "payer_phone" text;--> statement-breakpoint
ALTER TABLE "recurring_support" ADD COLUMN IF NOT EXISTS "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "payer_phone" text;
