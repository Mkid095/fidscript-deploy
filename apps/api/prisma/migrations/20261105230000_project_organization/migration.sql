-- A project can belong to a workspace (an organization / team).
--
-- Null means the project lives in its owner's own workspace, which is how
-- every project on an existing install is. Set, it means the team owns it
-- and the team's members are the project's members.
ALTER TABLE "projects"."projects"
  ADD COLUMN IF NOT EXISTS "organization_id" VARCHAR(36);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_organization_id_fkey'
  ) THEN
    ALTER TABLE "projects"."projects"
      ADD CONSTRAINT "projects_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "projects_projects_organization_id_idx"
  ON "projects"."projects"("organization_id");
