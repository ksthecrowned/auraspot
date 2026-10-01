ALTER TABLE "user" DROP COLUMN IF EXISTS "ai_credits";
ALTER TABLE "user" DROP COLUMN IF EXISTS "ai_credits_reset_at";
ALTER TABLE "user" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "user" DROP COLUMN IF EXISTS "subscription_id";
ALTER TABLE "user" DROP COLUMN IF EXISTS "subscription_ends_at";
ALTER TABLE "user" DROP COLUMN IF EXISTS "trial_ends_at";
