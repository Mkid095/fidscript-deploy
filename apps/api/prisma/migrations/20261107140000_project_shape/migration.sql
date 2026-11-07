-- What a project is for.
--
-- The console derives the project's menu from this, so it has to live on the
-- project and not in a browser. `deployment_on` is the switch that turns the
-- deployment service off for one project without changing what it is.
CREATE TYPE "public"."ProjectShape" AS ENUM ('BACKEND', 'DEPLOYMENT', 'BOTH');

ALTER TABLE "projects"."projects"
  ADD COLUMN IF NOT EXISTS "shape" "public"."ProjectShape" NOT NULL DEFAULT 'DEPLOYMENT';

ALTER TABLE "projects"."projects"
  ADD COLUMN IF NOT EXISTS "deployment_on" BOOLEAN NOT NULL DEFAULT true;
