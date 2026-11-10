-- BuildConfig: the build's own settings a person can override.
-- Null means "what the repository says" — the buildpack's detection stands.
ALTER TABLE "projects"."build_configs" ADD COLUMN "install_command" VARCHAR(500);
ALTER TABLE "projects"."build_configs" ADD COLUMN "build_command" VARCHAR(500);
ALTER TABLE "projects"."build_configs" ADD COLUMN "start_command" VARCHAR(500);
ALTER TABLE "projects"."build_configs" ADD COLUMN "port" INTEGER;
