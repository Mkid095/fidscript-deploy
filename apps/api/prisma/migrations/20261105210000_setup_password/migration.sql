-- The company password: the shared secret that gates registration.
--
-- The operator sets it during setup and the platform stores a bcrypt hash of
-- it. Null means registration is open — the same meaning the old
-- SIGNUP_INVITE_KEYWORD had when it was unset.
ALTER TABLE "platform"."installation_settings"
  ADD COLUMN IF NOT EXISTS "setup_password_hash" TEXT;
