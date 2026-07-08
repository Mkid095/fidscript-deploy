#!/usr/bin/env bash
# ============================================================
# push-to-production.sh — Rebuild & deploy WhatsApp API
#
# Usage (run from repo root):
#   bash scripts/push-to-production.sh
#
# Prerequisites:
#   - Must be run from the fidscript-whatsapp repo root
#   - Docker must be logged into the production registry
#   - Host environment must have: TUMA_API_KEY, RESEND_API_KEY,
#     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET set (or in ~/.env)
#
# What it does:
#   1. Validate paths
#   2. Extract secrets from source .env and export as shell env vars
#   3. Sync non-secret config to deployer/whatsapp-api.env
#   4. Build fidscript-whatsapp-api:latest image
#   5. docker compose up -d whatsapp-api chatbot-worker
#   6. Poll healthcheck until container is healthy
#
# Config precedence (inside container):
#   Docker env vars (from env_file + environment: ${VAR}) > baked .env
#   runWithProvider.js: dotenv.config({ override: false }) preserves Docker env.
#
# Secrets management:
#   Secrets (TUMA_API_KEY, RESEND_API_KEY, GOOGLE_CLIENT_ID/SECRET)
#   are NEVER written to whatsapp-api.env. They are exported as shell env
#   vars here, so docker compose can substitute ${VAR} in environment:.
#   The chatbot-worker's JWT_SECRET comes from a Docker secret file mount.
# ============================================================

set -euo pipefail

# ---- detect paths ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DEPLOYER_DIR="${REPO_ROOT}/fidscript-deploy/installer"

SRC_ENV="${REPO_ROOT}/apps/whatsapp-api/.env"
DEST_ENV="${DEPLOYER_DIR}/docker/whatsapp-api.env"
COMPOSE_FILE="${DEPLOYER_DIR}/docker/docker-compose.yml"

# ---- required secrets ----
REQUIRED_SECRETS=(
    TUMA_API_KEY
    RESEND_API_KEY
    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
)

echo "============================================"
echo "  FIDScript WhatsApp API — Push to Production"
echo "============================================"
echo ""

# ---- validate repo paths ----
if [[ ! -d "${REPO_ROOT}/apps/whatsapp-api" ]]; then
    echo "ERROR: Repo not found at ${REPO_ROOT}"
    echo "  This script must be run from the fidscript-whatsapp repository root."
    exit 1
fi

if [[ ! -f "${SRC_ENV}" ]]; then
    echo "ERROR: Source .env not found at ${SRC_ENV}"
    echo "  This file is the single source of truth and must exist in the repo."
    exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "ERROR: docker-compose.yml not found at ${COMPOSE_FILE}"
    exit 1
fi

echo "  Repo root   : ${REPO_ROOT}"
echo "  Source .env : ${SRC_ENV}"
echo "  Dest env    : ${DEST_ENV}"
echo ""

# ---- 1. Load and validate secrets from source .env ----
echo "[1/6] Checking secrets from source .env..."
# Source .env uses shell variable syntax (no quotes around values)
# shellcheck source=/dev/null
set -a
source "${SRC_ENV}"
set +a

MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    value="${!secret}"
    if [[ -z "${value}" ]]; then
        MISSING_SECRETS+=("${secret}")
    else
        echo "  ✓ ${secret} found"
    fi
done

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo ""
    echo "ERROR: Missing required secrets in ${SRC_ENV}:"
    for s in "${MISSING_SECRETS[@]}"; do echo "  - ${s}"; done
    exit 1
fi

# Export secrets so docker compose can resolve ${VAR} in environment: entries
export TUMA_API_KEY
export RESEND_API_KEY
export GOOGLE_CLIENT_ID
export GOOGLE_CLIENT_SECRET

# ---- 2. Sync non-secret config to deployer ----
echo ""
echo "[2/6] Syncing whatsapp-api.env to deployer (secrets stripped)..."
# Strip secret lines from source .env before copying to deployer
# This ensures whatsapp-api.env NEVER contains real secrets
grep -v -E "^(TUMA_API_KEY|RESEND_API_KEY|GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET)=" \
    "${SRC_ENV}" > "${DEST_ENV}"
echo "  → $(wc -l < "${DEST_ENV}") non-secret lines written"

# ---- 3. Build image ----
echo ""
echo "[3/6] Building fidscript-whatsapp-api:latest..."
BUILD_START=$(date +%s)
docker build \
    --network=host \
    -f "${REPO_ROOT}/apps/whatsapp-api/Dockerfile" \
    -t fidscript-whatsapp-api:latest \
    "${REPO_ROOT}" \
    2>&1 | tail -5
BUILD_END=$(date +%s)
echo "  → Built in $((BUILD_END - BUILD_START))s"

# ---- 4. Deploy containers ----
echo ""
echo "[4/6] Deploying whatsapp-api and chatbot-worker..."
cd "${DEPLOYER_DIR}/docker"

# --no-deps: don't restart services that whatsapp-api depends on (postgres, redis, etc.)
# Secrets (TUMA_API_KEY, etc.) come from exported shell env vars above.
docker compose \
    -f "${COMPOSE_FILE}" \
    up -d \
    --no-deps \
    whatsapp-api chatbot-worker

# ---- 5. Wait for health ----
echo ""
echo "[5/6] Waiting for whatsapp-api to become healthy..."
HEALTHY=false
for i in {1..30}; do
    sleep 2
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' fidscript_whatsapp_api 2>/dev/null || echo "missing")
    if [[ "${STATUS}" == "healthy" ]]; then
        HEALTHY=true
        break
    fi
    echo "  attempt ${i}: ${STATUS}"
done

# ---- 6. Report ----
echo ""
if [[ "${HEALTHY}" == "true" ]]; then
    echo "[6/6] ✓ Container is healthy"
    echo ""
    echo "============================================"
    echo "  ✓ Deployment successful"
    echo "============================================"
    docker inspect --format='{{.Config.Image}} @ {{.Created}}' fidscript_whatsapp_api
    echo ""
    echo "  WhatsApp API  : http://localhost:3099"
    echo "  QR endpoint   : https://whatsapp.fidscript.com"
    echo "  Health check  : http://localhost:3099/health"
    echo "  chatbot-worker: $(docker inspect --format='{{.State.Status}}' fidscript-chatbot-worker 2>/dev/null || echo 'not found')"
else
    echo "[6/6] ✗ Container failed to become healthy"
    echo ""
    echo "Last 30 log lines:"
    docker logs fidscript_whatsapp_api --tail 30 2>&1
    echo ""
    echo "============================================"
    echo "  ✗ Deployment failed"
    echo "============================================"
    exit 1
fi
