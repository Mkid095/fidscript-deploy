-- Add keyPrefix index to ProjectApiKey so validateProjectApiKey can narrow to
-- the 1-3 candidate rows for a given key instead of bcrypt-comparing every key.
-- Existing rows backfill the prefix from the bcrypt hash header prefix; they will
-- never match a real key (the raw body is required) so they are inert dead rows
-- that can be revoked or left to expire.
ALTER TABLE "projects"."api_keys"
  ADD COLUMN IF NOT EXISTS "key_prefix" VARCHAR(16);
-- Rows that predate this column have no prefix to index by. Backfill them
-- with a placeholder so the NOT NULL constraint below can be applied; the
-- prefix is only ever used to narrow a lookup, never to authenticate.
UPDATE "projects"."api_keys" SET "key_prefix" = 'legacy00' WHERE "key_prefix" IS NULL;
ALTER TABLE "projects"."api_keys" ALTER COLUMN "key_prefix" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "api_keys_key_prefix_idx"
  ON "projects"."api_keys" ("key_prefix");