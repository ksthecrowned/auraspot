CREATE TABLE "support" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"user_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'XAF' NOT NULL,
	"display_name" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_reference" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'XAF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_provider_reference_unique" UNIQUE("provider_reference")
);
--> statement-breakpoint
CREATE TABLE "payment_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"provider_reference" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_event_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"support_id" uuid,
	"payment_id" uuid,
	"withdrawal_id" uuid,
	"entry_type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'XAF' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entry_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "withdrawal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"gross_amount" integer NOT NULL,
	"commission_bps" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"net_amount" integer NOT NULL,
	"currency" text DEFAULT 'XAF' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_support_id_support_id_fk" FOREIGN KEY ("support_id") REFERENCES "public"."support"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_support_id_support_id_fk" FOREIGN KEY ("support_id") REFERENCES "public"."support"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_personality_id_personality_id_fk" FOREIGN KEY ("personality_id") REFERENCES "public"."personality"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_withdrawal_id_withdrawal_id_fk" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."withdrawal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "support_personality_id_idx" ON "support" USING btree ("personality_id");
--> statement-breakpoint
CREATE INDEX "support_user_id_idx" ON "support" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "payment_support_id_idx" ON "payment" USING btree ("support_id");
--> statement-breakpoint
CREATE INDEX "ledger_entry_personality_id_idx" ON "ledger_entry" USING btree ("personality_id");
--> statement-breakpoint
CREATE INDEX "ledger_entry_withdrawal_id_idx" ON "ledger_entry" USING btree ("withdrawal_id");
--> statement-breakpoint
CREATE INDEX "withdrawal_personality_id_idx" ON "withdrawal" USING btree ("personality_id");
--> statement-breakpoint
CREATE INDEX "withdrawal_requested_by_user_id_idx" ON "withdrawal" USING btree ("requested_by_user_id");
