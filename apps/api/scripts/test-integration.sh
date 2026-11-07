#!/usr/bin/env bash
#
# The integration tier.
#
# The tests run the **real** platform — the real controllers, the real
# guards, the real services — against a database of its own, over HTTP.
# That needs the platform's own network (PostgreSQL, NATS and Redis are not
# published to the host), so on the platform the tests run in a container on
# it. Where a PostgreSQL is reachable directly — the CI's service
# container — the tests run where they are.
#
# The database is created before the run and dropped after it: a test must
# never touch the platform's data, and it must not leave any behind.
#
# Usage: apps/api/scripts/test-integration.sh [jest arguments]
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${API_DIR}/../.." && pwd)"

DB_NAME="${TEST_DB_NAME:-fidscript_test}"
DB_ROLE="${TEST_DB_ROLE:-fidscript_test}"
DB_PASSWORD="${TEST_DB_PASSWORD:-fidscript_test_password}"
DB_CONTAINER="${TEST_DB_CONTAINER:-fidscript_postgres}"
# The platform's data services — PostgreSQL, NATS, Redis, the object store —
# are all on the deployment network.
NETWORK="${FIDScript_TEST_NETWORK:-fidscript-deployment}"

if [ -n "${TEST_DB_ADMIN_URL:-}" ]; then
  # A PostgreSQL that is reachable directly: the tests run here.
  RUNNER="host"
  PG_HOST="127.0.0.1"
  MIGRATE_HOST="127.0.0.1"
  psql_admin() { psql "${TEST_DB_ADMIN_URL}" -c "$1"; }
  psql_query() { psql "${TEST_DB_ADMIN_URL}" -t -A -c "$1"; }
else
  # The platform's own PostgreSQL: the statements go through its container,
  # which authenticates locally and needs no password here.
  RUNNER="container"
  PG_HOST="postgres"
  # The host reaches the platform's PostgreSQL by its address; the name
  # `postgres` only resolves inside the Docker network.
  MIGRATE_HOST="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${DB_CONTAINER}" | awk '{print $1}')"
  psql_admin() { docker exec -i "${DB_CONTAINER}" psql -U fidscript -d postgres -c "$1"; }
  psql_query() { docker exec -i "${DB_CONTAINER}" psql -U fidscript -d postgres -t -A -c "$1"; }
fi

TEST_URL="postgresql://${DB_ROLE}:${DB_PASSWORD}@${PG_HOST}:5432/${DB_NAME}"
# The migration runs here, on the host — where the name `postgres` does not
# resolve — so it uses the address.
MIGRATE_URL="postgresql://${DB_ROLE}:${DB_PASSWORD}@${MIGRATE_HOST}:5432/${DB_NAME}"

echo "→ creating the test database"
psql_admin "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_ROLE}') THEN CREATE ROLE ${DB_ROLE} WITH LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB; END IF; END \$\$;"
psql_admin "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);"
psql_admin "CREATE DATABASE ${DB_NAME} OWNER ${DB_ROLE};"

cleanup() {
  echo "→ dropping the test database"
  # A provisioned database leaves a database and a role of its own in the
  # cluster; they belong to the test and go with it.
  psql_query "SELECT datname FROM pg_database WHERE datname LIKE 'proj%';" 2>/dev/null |
    while read -r provisioned; do
      [ -n "${provisioned}" ] && psql_admin "DROP DATABASE IF EXISTS \"${provisioned}\" WITH (FORCE);" || true
    done
  psql_admin "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" || true
  psql_query "SELECT rolname FROM pg_roles WHERE rolname LIKE 'proj%';" 2>/dev/null |
    while read -r role; do
      [ -n "${role}" ] && psql_admin "DROP ROLE IF EXISTS \"${role}\";" || true
    done
  psql_admin "DROP ROLE IF EXISTS ${DB_ROLE};" || true
}
trap cleanup EXIT

echo "→ migrating the test database"
(cd "${API_DIR}" && DATABASE_URL="${MIGRATE_URL}" npx prisma migrate deploy >/dev/null)

echo "→ running the integration tests"
if [ "${RUNNER}" = "host" ]; then
  (cd "${API_DIR}" && TEST_DATABASE_URL="${TEST_URL}" npx jest \
    --config jest.integration.config.js --runInBand --forceExit "$@")
else
  docker run --rm \
    --network "${NETWORK}" \
    -v "${REPO_DIR}:/app" -w /app \
    -e "TEST_DATABASE_URL=${TEST_URL}" \
    -e "TEST_DB_NAME=${DB_NAME}" \
    node:20-bookworm-slim \
    bash -c "apt-get update -qq && apt-get install -y -qq openssl libssl-dev >/dev/null 2>&1; \
      cd apps/api && npx jest --config jest.integration.config.js --runInBand --forceExit $*"
fi
