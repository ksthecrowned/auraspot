-- Withdrawals: where to send the money, and the admin review (transfer
-- reference or refusal reason, who and when).
ALTER TABLE "withdrawal" ADD COLUMN IF NOT EXISTS "payout_operator" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN IF NOT EXISTS "payout_phone" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN IF NOT EXISTS "payout_reference" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN IF NOT EXISTS "review_note" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;