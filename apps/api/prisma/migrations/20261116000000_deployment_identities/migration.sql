-- DeploymentIdentity: the project's ONE deployment identity.
--
-- A project is not a pile of deployments — it is one application with a
-- deployment history. The identity is established by the first deployment
-- and belongs to the project for life; later versions build, replace and
-- roll back within it. project_id is unique, so a second independent
-- identity under the same project is impossible at the database level,
-- and a race between two first-time initializations settles on the one
-- that committed first.
--
-- WebhookDelivery: one row per GitHub delivery the platform saw. GitHub
-- retries an unanswered delivery with the same delivery id, so the id is
-- the dedup key: an accepted delivery is never processed twice.

CREATE TABLE IF NOT EXISTS "projects"."deployment_identities" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "initial_release_id" TEXT,
    "initialized_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "deployment_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "deployment_identities_project_id_key" ON "projects"."deployment_identities" ("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "deployment_identities_initial_release_id_key" ON "projects"."deployment_identities" ("initial_release_id");

ALTER TABLE "projects"."deployment_identities" ADD CONSTRAINT "deployment_identities_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects"."deployment_identities" ADD CONSTRAINT "deployment_identities_initial_release_id_fkey"
    FOREIGN KEY ("initial_release_id") REFERENCES "projects"."releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every release belongs to the project's identity. Null only on rows from
-- before the identity existed — the backfill below links them all.
ALTER TABLE "projects"."releases" ADD COLUMN "deployment_identity_id" TEXT;
ALTER TABLE "projects"."releases" ADD CONSTRAINT "releases_deployment_identity_id_fkey"
    FOREIGN KEY ("deployment_identity_id") REFERENCES "projects"."deployment_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "releases_deployment_identity_id_idx" ON "projects"."releases" ("deployment_identity_id");

-- The commit the production branch last deployed successfully: pushes of
-- it are no-ops, and a build that finishes behind a newer success is not
-- promoted over it.
ALTER TABLE "projects"."projects" ADD COLUMN "last_deployed_commit" VARCHAR(40);

CREATE TABLE IF NOT EXISTS "projects"."webhook_deliveries" (
    "id" TEXT NOT NULL,
    "delivery_id" VARCHAR(100) NOT NULL,
    "project_id" TEXT NOT NULL,
    "commit_sha" VARCHAR(40) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL DEFAULT 'accepted',
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_deliveries_delivery_id_key" ON "projects"."webhook_deliveries" ("delivery_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_project_id_commit_sha_idx" ON "projects"."webhook_deliveries" ("project_id", "commit_sha");
ALTER TABLE "projects"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Backfill: establish the identity for projects that already have a deployment history ──
--
-- One identity per project, the OLDEST release as the one that established
-- it, and the newest successful commit as last_deployed_commit. Nothing is
-- deleted or merged: existing releases, deployments, URLs and ownership are
-- untouched — the identity is the frame they already lived inside.

INSERT INTO "projects"."deployment_identities" ("id", "project_id", "initial_release_id", "initialized_at", "created_at", "updated_at")
SELECT gen_random_uuid(), oldest."project_id", oldest."id", oldest."created_at", now(), now()
FROM (
    SELECT DISTINCT ON ("project_id") "id", "project_id", "created_at"
    FROM "projects"."releases"
    ORDER BY "project_id", "created_at"
) AS oldest;

UPDATE "projects"."releases" r
SET "deployment_identity_id" = d."id"
FROM "projects"."deployment_identities" d
WHERE d."project_id" = r."project_id";

UPDATE "projects"."projects" p
SET "last_deployed_commit" = s."commit_sha"
FROM (
    SELECT DISTINCT ON (d."project_id") d."project_id", r."commitSha" AS "commit_sha"
    FROM "projects"."deployments" d
    JOIN "projects"."releases" r ON r."id" = d."release_id"
    WHERE d."status" = 'SUCCESS'
      -- A commit-less success (a manual zip) is not a dedup key: a later
      -- git push must not read as "the same commit".
      AND r."commitSha" <> ''
    ORDER BY d."project_id", d."completed_at" DESC NULLS LAST
) s
WHERE p."id" = s."project_id";
