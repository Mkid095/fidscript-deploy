-- BuildConfig: the container's resource ceilings, per project.
-- Null means "the platform default" (512 MB, one core). The host stays the
-- host: nothing a project runs may take the machine down with it.
ALTER TABLE "projects"."build_configs" ADD COLUMN IF NOT EXISTS "memory_limit_mb" INTEGER;
ALTER TABLE "projects"."build_configs" ADD COLUMN IF NOT EXISTS "cpu_limit_millicpu" INTEGER;
