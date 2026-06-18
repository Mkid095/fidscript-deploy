#!/bin/sh
# FIDScript API container entrypoint.
# Reads *_FILE env vars, materializes them, then runs Prisma migrations + starts the API.
set -e

echo "[entrypoint] Starting FIDScript API..."

# Materialize *_FILE env vars into real env vars
# Each var: VARNAME_FILE=/path/to/file → exports VARNAME=<file contents>
for _file_var in $(env | grep '_FILE=' | cut -d= -f1); do
    _real_var="${_file_var%_FILE}"
    _file_path="$(eval echo \$$_file_var)"
    if [ -f "$_file_path" ]; then
        _value="$(cat "$_file_path")"
        export "$_real_var=$_value"
        echo "[entrypoint] $_real_var loaded from $_file_path"
    else
        echo "[entrypoint] WARNING: $_file_var=$_file_path not found — skipping"
    fi
done

echo "[entrypoint] Running Prisma migrations..."
cd /app/apps/api
# Migrations MUST go through DIRECT_URL (postgres direct), not via pgbouncer.
# pgbouncer in transaction-pooling mode reuses backend connections, which
# conflicts with Prisma's prepared statements ("ERROR: prepared statement
# \"s1\" already exists"). Runtime queries use DATABASE_URL (pgbouncer) fine
# for normal traffic; migrations are admin DDL and need the direct path.
export DATABASE_URL="$DIRECT_URL"
npx prisma migrate deploy

echo "[entrypoint] Seeding database..."
# Seed also via DIRECT_URL (same reason — DDL on first-run seed). The runtime
# image doesn't ship pnpm, so use `npx prisma db seed` which respects the
# `prisma.seed` config in package.json (tsx prisma/seed.ts).
npx prisma db seed || echo "[entrypoint] Seed skipped (admin may already exist)"

# Restore DATABASE_URL to the pgbouncer-pooled one for runtime queries.
unset DIRECT_URL
export DATABASE_URL="postgresql://fidscript:${POSTGRES_PASSWORD}@pgbouncer:6432/fidscript?pgbouncer=true"

echo "[entrypoint] Starting FIDScript API on port ${API_PORT:-3001}..."
# CWD is already /app/apps/api (we cd'd for Prisma), so the entry is `dist/main.js`.
exec node dist/main.js