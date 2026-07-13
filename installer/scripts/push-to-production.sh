#!/usr/bin/env bash
# ============================================================
# push-to-production.sh — Rebuild & deploy WhatsApp API
#
# Usage (run from the fidscript-deploy repository on the server):
#   bash scripts/push-to-production.sh
#
# Prerequisites on the server:
#   - fidscript-whatsapp repo cloned at ~/fidscript-whatsapp
#   - fidscript-deploy repo cloned at ~/fidscript-deploy
#   - Host env vars: TUMA_API_KEY, RESEND_API_KEY,
#     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (exported or in ~/.env)
#   - ~/fidscript-deploy/installer/docker/whatsapp-api.env exists
#     (non-secret config, NOT from the repo's .env)
#
# What it does:
#   1. Validate prerequisites
#   2. Export secrets from host environment
#   3. Build fidscript-whatsapp-api:latest from source repo
#   4. docker compose up -d whatsapp-api chatbot-worker
#   5. Poll healthcheck until container is healthy
#
# Config architecture:
#   whatsapp-api.env          ← non-secret config (server file, NOT from repo)
#   docker compose env_file   ← loads whatsapp-api.env
#   docker compose ${VAR}     ← resolved from HOST env at deploy time
#   Container env             ← Docker merges env_file + environment:; dotenv fills
#                               only MISSING vars (override: false in runWithProvider.js)
#
# Secrets: NEVER in git. NEVER in whatsapp-api.env.
# All secrets come from host environment at deploy time.
# ============================================================

set -euo pipefail

# Load ~/.env if present (allows secrets to be stored in ~/fidscript-secrets.env)
# This is NOT committed to git — only the server operator uses it.
# shellcheck source=/dev/null
[[ -f ~/.env ]] && source ~/.env
# shellcheck source=/dev/null
[[ -f ~/fidscript-secrets.env ]] && source ~/fidscript-secrets.env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="${DEPLOYER_DIR}/../fidscript-whatsapp"

COMPOSE_FILE="${DEPLOYER_DIR}/docker/docker-compose.yml"
WHATSAPP_API_ENV="${DEPLOYER_DIR}/docker/whatsapp-api.env"
WHATSAPP_API_ENV_EXAMPLE="${DEPLOYER_DIR}/docker/whatsapp-api.env.example"

# ---- required env vars (must be set on host before running this script) ----
REQUIRED_HOST_VARS=(
    TUMA_API_KEY
    RESEND_API_KEY
    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
)

echo "============================================"
echo "  FIDScript WhatsApp API — Push to Production"
echo "============================================"
echo ""

# ---- validate ----
if [[ ! -d "${REPO_ROOT}/apps/whatsapp-api" ]]; then
    echo "ERROR: Source repo not found at ${REPO_ROOT}"
    echo "  Clone it with: git clone <url> ~/fidscript-whatsapp"
    exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "ERROR: docker-compose.yml not found at ${COMPOSE_FILE}"
    exit 1
fi

if [[ ! -f "${WHATSAPP_API_ENV}" ]]; then
    echo "ERROR: whatsapp-api.env not found at ${WHATSAPP_API_ENV}"
    echo ""
    echo "  First-time setup: copy the example template and fill in your values:"
    echo "    cp ${WHATSAPP_API_ENV}.example ${WHATSAPP_API_ENV}"
    echo "    # edit ${WHATSAPP_API_ENV} — replace CHANGE_ME with real values"
    echo ""
    echo "  This file lives on the SERVER — never overwritten by the push script."
    exit 1
fi

# ---- 1. Validate host env secrets ----
echo "[1/5] Checking host environment secrets..."
MISSING=()
for var in "${REQUIRED_HOST_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        MISSING+=("${var}")
        echo "  ✗ ${var} is not set"
    else
        echo "  ✓ ${var}"
    fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo ""
    echo "ERROR: Missing required environment variables: ${MISSING[*]}"
    echo "  Set them before running this script:"
    echo "    export TUMA_API_KEY=..."
    echo "    export RESEND_API_KEY=..."
    echo "    export GOOGLE_CLIENT_ID=..."
    echo "    export GOOGLE_CLIENT_SECRET=..."
    exit 1
fi

# Export so docker compose can resolve ${VAR} in environment: entries
export TUMA_API_KEY
export RESEND_API_KEY
export GOOGLE_CLIENT_ID
export GOOGLE_CLIENT_SECRET

# ---- 2. Log deployment SHA ----
GIT_SHA=$(cd "${REPO_ROOT}" && git rev-parse HEAD)
echo ""
echo "[2/5] Deployment SHA: ${GIT_SHA}"
echo "  $(cd "${REPO_ROOT}" && git log -1 --oneline)"

# ---- 3. Build image ----
echo ""
echo "[3/5] Building fidscript-whatsapp-api:latest..."
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
echo "[4/5] Deploying whatsapp-api and chatbot-worker..."
cd "${DEPLOYER_DIR}/docker"

# Secrets (TUMA_API_KEY, etc.) come from exported HOST env vars above.
# whatsapp-api.env is loaded via env_file in docker-compose.yml.
# chatbot-worker uses JWT_SECRET_FILE from Docker secret mount.
docker compose \
    -f "${COMPOSE_FILE}" \
    up -d \
    --no-deps \
    whatsapp-api chatbot-worker

# ---- 5. Wait for health ----
echo ""
echo "[5/5] Waiting for whatsapp-api to become healthy..."
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

echo ""
if [[ "${HEALTHY}" == "true" ]]; then
    echo "✓ Container is healthy"
    echo ""
    echo "============================================"
    echo "  ✓ Deployment successful"
    echo "============================================"
    docker inspect --format='{{.Config.Image}} @ {{.Created}}' fidscript_whatsapp_api
    echo "  Git SHA    : ${GIT_SHA}"
    echo ""
    echo "  WhatsApp API  : http://localhost:3099"
    echo "  QR endpoint    : https://whatsapp.fidscript.com"
    echo "  Health check   : http://localhost:3099/health"
    echo "  chatbot-worker: $(docker inspect --format='{{.State.Status}}' fidscript-chatbot-worker 2>/dev/null || echo 'not found')"
else
    echo "✗ Container failed to become healthy"
    echo ""
    echo "Last 30 log lines:"
    docker logs fidscript_whatsapp_api --tail 30 2>&1
    echo ""
    echo "============================================"
    echo "  ✗ Deployment failed"
    echo "============================================"
    exit 1
fi
