-- CreateProjectStorageConfig
CREATE TABLE "storage"."project_storage_configs" (
  "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "project_id" VARCHAR(36) NOT NULL,
  "default_provider" VARCHAR(50) NOT NULL DEFAULT 'internal',
  "cloudinary_creds_set" BOOLEAN NOT NULL DEFAULT false,
  "telegram_creds_set" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "project_storage_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "project_storage_configs_project_id_key" ON "storage"."project_storage_configs"("project_id");