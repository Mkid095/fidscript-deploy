#!/bin/sh
# FIDScript API container entrypoint.
set -e

echo "[entrypoint] Starting FIDScript API..."

# Materialize *_FILE env vars into real env vars
for _file_var in $(env | grep '_FILE=' | cut -d= -f1); do
    _real_var=$(echo "$_file_var" | sed 's/_FILE$//')
    eval "_file_path=\"\$$_file_var\""
    if [ -f "$_file_path" ]; then
        _value=$(cat "$_file_path")
        eval "export $_real_var=\$_value"
        echo "[entrypoint] $_real_var loaded"
    else
        echo "[entrypoint] WARNING: $_file_var not found — skipping"
    fi
done

cd /app/apps/api

# Migrations go through DIRECT_URL (postgres direct), not pgbouncer.
# pgbouncer in transaction mode conflicts with Prisma's prepared statements.
# Use lock_timeout=30s so pg_advisory_lock retries longer before failing —
# pgbouncer session-reuse can leave a stale lock from a prior interrupted run.
export DATABASE_URL="${DIRECT_URL}&lock_timeout=30000&statement_timeout=60000"

# Skip migrate deploy if the migration is already recorded as applied.
# This prevents advisory-lock timeout on container restarts (the stale lock
# from a previous interrupted migration blocks retries indefinitely).
# Fresh installs still run migrate deploy normally.
_status=$(npx prisma migrate status 2>&1 || true)
case "$_status" in
    *"schema is up to date"*)
        echo "[entrypoint] Migration already applied — skipping migrate deploy"
        ;;
    *)
        echo "[entrypoint] Running Prisma migrations..."
        npx prisma migrate deploy
        ;;
esac

echo "[entrypoint] Seeding database..."
npx prisma db seed || echo "[entrypoint] Seed skipped (admin may already exist)"

# Restore DATABASE_URL to the pgbouncer-pooled one for runtime queries.
export DATABASE_URL="postgresql://fidscript:${POSTGRES_PASSWORD}@pgbouncer:6432/fidscript?pgbouncer=true"

echo "[entrypoint] Starting FIDScript API on port ${API_PORT:-3001}..."
exec node dist/main.js
