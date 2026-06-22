#!/bin/sh
# FIDScript API container entrypoint.
set -e

echo "[entrypoint] Starting FIDScript API..."

# Materialize *_FILE env vars into real env vars.
# The *_FILE vars are set by Docker's env_file + environment directive.
for _f in $(env | grep '_FILE=' | cut -d= -f1); do
    _v=$(echo "$_f" | sed 's/_FILE$//')
    _p=$(eval echo "\$$_f")
    if [ -f "$_p" ]; then
        _val=$(cat "$_p")
        # POSIX/dash-safe export: one quoted "NAME=value" word.
        # (printf -v and ${var:0:n} are bash-only and broke under /bin/sh.)
        export "$_v=$_val"
        echo "[entrypoint] $_v loaded"
    else
        echo "[entrypoint] WARNING: $_f not found — skipping"
    fi
done

cd /app/apps/api

# Migrations go through DIRECT_URL (postgres direct), not pgbouncer.
# pgbouncer in transaction mode conflicts with Prisma's prepared statements.
# Use ? to append query params, not & — otherwise they become part of the database name.
export DATABASE_URL="${DIRECT_URL}?lock_timeout=30000&statement_timeout=60000"

# Check migration status and handle all cases:
# 1. "schema is up to date"     → skip (clean state)
# 2. "failed migrations found"  → resolve them as rolled-back, then deploy
# 3. otherwise                  → run migrate deploy
_status=$(npx prisma migrate status 2>&1 || true)
case "$_status" in
    *"schema is up to date"*)
        echo "[entrypoint] Migration already applied — skipping migrate deploy"
        ;;
    *"failed migrations"*)
        echo "[entrypoint] Failed migrations detected — resolving as rolled-back..."
        _failed=$(echo "$_status" | grep 'migration.*failed' | sed 's/.*migration "\([^"]*\)".*/\1/' | tr '\n' ' ')
        for _m in $_failed; do
            echo "[entrypoint] Rolling back failed migration: $_m"
            npx prisma migrate resolve --rolled-back "$_m" 2>/dev/null || true
        done
        echo "[entrypoint] Running Prisma migrations..."
        npx prisma migrate deploy
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
