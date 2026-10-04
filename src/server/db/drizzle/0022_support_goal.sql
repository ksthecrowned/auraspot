-- One active fundraising goal per fiche. Individual amounts stay off the public card.
CREATE TABLE IF NOT EXISTS "support_goal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "personality_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "target_amount" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "ends_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "reached_notified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "support_goal" ADD CONSTRAINT "support_goal_personality_id_link_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "support_goal_one_active_idx" ON "support_goal" ("personality_id") WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN IF NOT EXISTS "goal_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "support" ADD CONSTRAINT "support_goal_id_support_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."support_goal"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
