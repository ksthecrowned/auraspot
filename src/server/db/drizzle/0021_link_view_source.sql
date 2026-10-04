-- Where a visit came from. Only carte, qr and bio are stored; anything else stays null.
ALTER TABLE "link_view" ADD COLUMN IF NOT EXISTS "source" text;
