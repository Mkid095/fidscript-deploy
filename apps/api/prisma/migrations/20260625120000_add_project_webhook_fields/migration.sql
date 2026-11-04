-- AlterTable
ALTER TABLE "projects"."projects" ADD COLUMN IF NOT EXISTS "webhook_secret" VARCHAR(255);
ALTER TABLE "projects"."projects" ADD COLUMN IF NOT EXISTS "github_hook_id" INTEGER;
ALTER TABLE "projects"."projects" ADD COLUMN IF NOT EXISTS "auto_deploy" BOOLEAN NOT NULL DEFAULT true;
