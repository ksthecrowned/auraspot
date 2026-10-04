-- A report can point at one dedication. Hiding that message does not touch the payment.
ALTER TABLE "personality_report" ADD COLUMN IF NOT EXISTS "support_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "personality_report" ADD CONSTRAINT "personality_report_support_id_support_id_fk" FOREIGN KEY ("support_id") REFERENCES "public"."support"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
