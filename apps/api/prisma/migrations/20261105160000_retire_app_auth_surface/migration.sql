-- The app developer's auth surface moves to Instant.
--
-- The platform had a second, weaker user system for applications:
-- per-project roles with a JSON permission blob, per-project OAuth provider
-- configuration, and the linked OAuth accounts. Instant's CEL permission
-- rules are evaluated per entity per action against live data, which the
-- role blobs never were — so the platform's version is the weaker duplicate
-- of a thing that already exists, and it goes.
--
-- What stays is `app_users` and `app_sessions`: they back the magic-code
-- login the WhatsApp console signs in with, and the platform's own GitHub
-- credential store is a separate table entirely.
--
-- See `docs/CAPABILITY_OVERLAP.md`.
DROP TABLE IF EXISTS "projects"."app_user_roles";
DROP TABLE IF EXISTS "projects"."app_oauth_accounts";
DROP TABLE IF EXISTS "projects"."app_roles";
DROP TABLE IF EXISTS "projects"."auth_providers";
DROP TYPE IF EXISTS "projects"."AuthProviderName";
