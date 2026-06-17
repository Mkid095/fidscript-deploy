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
npx prisma migrate deploy

echo "[entrypoint] Seeding database..."
pnpm db:seed || echo "[entrypoint] Seed skipped (admin may already exist)"

echo "[entrypoint] Starting FIDScript API on port ${API_PORT:-3001}..."
exec node apps/api/dist/main.js