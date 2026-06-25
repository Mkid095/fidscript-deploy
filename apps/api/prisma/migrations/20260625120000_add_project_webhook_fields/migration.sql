-- AlterTable
ALTER TABLE "projects"."projects" ADD COLUMN "webhook_secret" VARCHAR(255);
ALTER TABLE "projects"."projects" ADD COLUMN "github_hook_id" INTEGER;
ALTER TABLE "projects"."projects" ADD COLUMN "auto_deploy" BOOLEAN NOT NULL DEFAULT true;
