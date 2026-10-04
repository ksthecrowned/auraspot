-- Public dedications on a support. The amount stays off this message.
ALTER TABLE "support" ADD COLUMN IF NOT EXISTS "message" text;--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN IF NOT EXISTS "message_hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN IF NOT EXISTS "thanked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN IF NOT EXISTS "thank_you_reply" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_personality_message_idx" ON "support" USING btree ("personality_id","created_at") WHERE "support"."message" is not null;
