CREATE TABLE "personality_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"reporter_user_id" text,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personality_report" ADD CONSTRAINT "personality_report_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "personality_report" ADD CONSTRAINT "personality_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "personality_report_personality_id_idx" ON "personality_report" USING btree ("personality_id");
--> statement-breakpoint
CREATE INDEX "personality_report_status_idx" ON "personality_report" USING btree ("status");
