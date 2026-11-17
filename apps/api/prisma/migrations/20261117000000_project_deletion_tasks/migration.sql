-- ProjectDeletionTask: the deletion cleanup as a state machine.
--
-- Deleting a project takes the surface down at once — the containers,
-- the in-flight builds, the routes — while the record and the images
-- stay for the 30-day recovery window, so a restore can relight the
-- deployment. This table is what the operator can see while that
-- happens: which step of the cleanup ran, which failed, and where a
-- retry must resume.
--
--   REQUESTED      the delete was accepted, cleanup not yet started
--   IN_PROGRESS    a cleanup is running right now
--   CLEANUP_FAILED a step failed (last_error says which); the sweep
--                  retries without redoing the finished steps
--   CLEANED        the surface is down; record and images stay for
--                  the recovery window
--   PURGED         the window is over — images gone, domains released,
--                  the row itself is about to go with the project
--
-- A retry must never recreate the website: the finished steps are
-- recorded in resources, and each step is idempotent to begin with.

CREATE TABLE IF NOT EXISTS "projects"."project_deletion_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "resources" JSONB NOT NULL DEFAULT '{}',
    "last_error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "project_deletion_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_deletion_tasks_project_id_key" ON "projects"."project_deletion_tasks" ("project_id");

ALTER TABLE "projects"."project_deletion_tasks" ADD CONSTRAINT "project_deletion_tasks_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Projects already deleted (soft) before this table existed need the
-- same guarantee: their surface was never taken down, and the sweep
-- picks them up. Backfill one REQUESTED task per deleted project.
INSERT INTO "projects"."project_deletion_tasks" ("id", "project_id", "state")
SELECT gen_random_uuid(), p.id, 'REQUESTED'
FROM "projects"."projects" p
WHERE p."deleted_at" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "projects"."project_deletion_tasks" t WHERE t."project_id" = p.id);
