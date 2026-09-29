CREATE TABLE "recurring_support" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'XAF' NOT NULL,
	"display_name" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"next_charge_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support" ADD COLUMN "recurring_support_id" uuid;
--> statement-breakpoint
ALTER TABLE "recurring_support" ADD CONSTRAINT "recurring_support_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_support" ADD CONSTRAINT "recurring_support_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_recurring_support_id_recurring_support_id_fk" FOREIGN KEY ("recurring_support_id") REFERENCES "public"."recurring_support"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "recurring_support_user_id_idx" ON "recurring_support" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_support_active_user_personality_idx" ON "recurring_support" USING btree ("user_id","personality_id") WHERE status = 'active';
--> statement-breakpoint
CREATE INDEX "support_recurring_support_id_idx" ON "support" USING btree ("recurring_support_id");
