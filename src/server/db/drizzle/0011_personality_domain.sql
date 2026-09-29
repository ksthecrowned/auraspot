CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "personality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"bio" text,
	"location" text,
	"category_id" uuid,
	"claim_status" text DEFAULT 'unclaimed' NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personality_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "social_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personality_manager" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'manager' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personality_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"relationship" text NOT NULL,
	"statement" text NOT NULL,
	"evidence_urls" json DEFAULT '[]'::json NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personality" ADD CONSTRAINT "personality_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality" ADD CONSTRAINT "personality_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_link" ADD CONSTRAINT "social_link_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_manager" ADD CONSTRAINT "personality_manager_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_manager" ADD CONSTRAINT "personality_manager_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_claim" ADD CONSTRAINT "personality_claim_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_claim" ADD CONSTRAINT "personality_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_claim" ADD CONSTRAINT "personality_claim_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personality_category_id_idx" ON "personality" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "personality_created_at_idx" ON "personality" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "personality_status_idx" ON "personality" USING btree ("status");--> statement-breakpoint
CREATE INDEX "social_link_personality_id_idx" ON "social_link" USING btree ("personality_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personality_manager_personality_user_unique" ON "personality_manager" USING btree ("personality_id","user_id");--> statement-breakpoint
CREATE INDEX "personality_manager_user_id_idx" ON "personality_manager" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personality_claim_personality_id_idx" ON "personality_claim" USING btree ("personality_id");--> statement-breakpoint
CREATE INDEX "personality_claim_user_id_idx" ON "personality_claim" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personality_claim_status_idx" ON "personality_claim" USING btree ("status");--> statement-breakpoint
INSERT INTO "category" ("name", "slug", "sort_order") VALUES
	('Musique', 'music', 0),
	('Sport', 'sport', 1),
	('Créateurs', 'creators', 2),
	('Humour', 'humor', 3),
	('Mode', 'fashion', 4),
	('Business', 'business', 5),
	('Art', 'art', 6)
ON CONFLICT ("slug") DO NOTHING;
