-- The email-to-username mapping (user@domain -> user.domain) is not
-- injective: a@b.co.uk and a.b@co.uk both land on a.b.co.uk. A registry
-- user belongs to exactly one platform account, so the registry username
-- is unique across the table. The first link to land owns the name; any
-- other account claiming it is told, not silently queued.
CREATE UNIQUE INDEX IF NOT EXISTS "user_registry_credentials_registry_user_key"
  ON "identity"."user_registry_credentials"("registry_user");
