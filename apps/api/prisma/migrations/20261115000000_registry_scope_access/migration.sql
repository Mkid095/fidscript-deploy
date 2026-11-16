-- RegistryScopeAccess: who may read a registry scope's packages without a
-- token. The registry's config is regenerated from these rows — a scope
-- with anonymous_read on gets its access rule from $authenticated to $all.
-- Publishing stays authenticated either way: opening a scope lets the world
-- read, not write.

CREATE TABLE IF NOT EXISTS "infrastructure"."registry_scope_access" (
    "id" TEXT NOT NULL,
    "scope" VARCHAR(128) NOT NULL,
    "anonymous_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "registry_scope_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "registry_scope_access_scope_key" ON "infrastructure"."registry_scope_access" ("scope");
