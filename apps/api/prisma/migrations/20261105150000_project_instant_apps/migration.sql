-- The Instant BaaS app that backs a project's data plane.
--
-- The platform generates the app id and the admin token itself — Instant's
-- `POST /dash/apps` takes both from the request body — so the platform owns
-- a full-privilege credential for every app it provisions. The token is
-- stored encrypted (AES-256-GCM), so the column holds ciphertext only.
CREATE TABLE IF NOT EXISTS "projects"."project_instant_apps" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "admin_token_enc" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_instant_apps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_instant_apps_project_id_key"
    ON "projects"."project_instant_apps" ("project_id");

CREATE UNIQUE INDEX IF NOT EXISTS "project_instant_apps_app_id_key"
    ON "projects"."project_instant_apps" ("app_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'project_instant_apps_project_id_fkey'
          AND conrelid = '"projects"."project_instant_apps"'::regclass
    ) THEN
        ALTER TABLE "projects"."project_instant_apps"
            ADD CONSTRAINT "project_instant_apps_project_id_fkey"
            FOREIGN KEY ("project_id") REFERENCES "projects"."projects" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
