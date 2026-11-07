-- The variables a build cannot run without.
--
-- A deployment that is missing one of these fails BEFORE the build starts and
-- names the variable, so a half-configured application never reaches the
-- build stage and never leaves a confusing error in the log.
ALTER TABLE "projects"."build_configs"
  ADD COLUMN IF NOT EXISTS "required_env_vars" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
