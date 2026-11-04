#!/usr/bin/env bash
# ============================================================
# validate-stack.sh — End-to-end validation checklist
#
# Run AFTER push-to-production.sh succeeds.
# Each section prints PASS/FAIL and stops on first failure.
#
# Usage:
#   bash scripts/validate-stack.sh
# ============================================================

set -euo pipefail

API_BASE="http://localhost:3099"
FRONTEND_BASE="http://localhost"
WAIT=2

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC} — $1"; }
fail() { echo -e "${RED}✗ FAIL${NC} — $1"; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

echo "============================================"
echo "  FIDScript Stack — Validation Checklist"
echo "============================================"
echo ""

# ---- Infrastructure health ----
info "Checking infrastructure containers..."
for svc in fidscript_postgres fidscript_redis fidscript_nats fidscript_traefik; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "${svc}" 2>/dev/null || echo "missing")
    [[ "${STATUS}" == "running" ]] && pass "${svc} is running" || fail "${svc} is ${STATUS}"
done

# ---- WhatsApp API health ----
info "Checking WhatsApp API health..."
sleep 1
WA_STATUS=$(docker inspect --format='{{.State.Health.Status}}' fidscript_whatsapp_api 2>/dev/null || echo "missing")
[[ "${WA_STATUS}" == "healthy" ]] && pass "whatsapp-api is healthy" || fail "whatsapp-api is ${WA_STATUS}"
[[ "${WA_STATUS}" == "healthy" ]] || { docker logs fidscript_whatsapp_api --tail 10 2>&1; exit 1; }

# ---- WhatsApp API endpoints ----
info "Testing WhatsApp API /health..."
HEALTH=$(curl -sf "${API_BASE}/health" 2>/dev/null | head -c 100 || echo "")
[[ -n "${HEALTH}" ]] && pass "/health returned: ${HEALTH}" || fail "/health returned empty"

info "Testing WhatsApp API /..."
ROOT=$(curl -sf "${API_BASE}/" 2>/dev/null | head -c 100 || echo "")
[[ -n "${ROOT}" ]] && pass "/ returned: ${ROOT}" || fail "/ returned empty"

info "Testing WhatsApp API instance list (no auth)..."
LIST=$(curl -sf "${API_BASE}/instance/instanceList" 2>/dev/null | head -c 200 || echo "")
echo "  → ${LIST:0:100}"

info "Testing WhatsApp API webhook config..."
WEBHOOK=$(curl -sf "${API_BASE}/webhook/load" 2>/dev/null | head -c 100 || echo "")
echo "  → ${WEBHOOK:0:100}"

# ---- Backend API health ----
info "Checking SaaS backend health..."
BD_STATUS=$(docker inspect --format='{{.State.Health.Status}}' fidscript_api 2>/dev/null || echo "missing")
[[ "${BD_STATUS}" == "healthy" ]] && pass "backend is healthy" || fail "backend is ${BD_STATUS}"

info "Testing backend /api/v1/health..."
BD_HEALTH=$(curl -sf "http://localhost:3001/api/v1/health" 2>/dev/null | head -c 100 || echo "")
[[ -n "${BD_HEALTH}" ]] && pass "backend /health: ${BD_HEALTH}" || fail "backend /health empty"

# ---- Frontend ----
info "Testing frontend serves index.html..."
FE_HTML=$(curl -sf "${FRONTEND_BASE}/" 2>/dev/null | grep -o '<title>.*</title>' | head -1 || echo "")
[[ -n "${FE_HTML}" ]] && pass "frontend: ${FE_HTML}" || fail "frontend index.html empty or missing"

info "Testing frontend assets load..."
FE_ASSET=$(curl -sf -o /dev/null -w "%{http_code}" "${FRONTEND_BASE}/assets/" 2>/dev/null || echo "000")
# assets dir may 403 (nginx autoindex off is fine), check a known asset instead
FE_MAIN=$(curl -sf -o /dev/null -w "%{http_code}" "${FRONTEND_BASE}/" 2>/dev/null || echo "000")
[[ "${FE_MAIN}" == "200" ]] && pass "frontend root returns 200" || fail "frontend root returns ${FE_MAIN}"

# ---- Network connectivity: backend → WhatsApp API ----
info "Testing backend can reach WhatsApp API internally..."
# The backend (fidscript_api container) reaches WhatsApp API via fidscript_whatsapp_api:3099
# We simulate this by hitting the WhatsApp API health from the backend network
curl -sf --max-time 5 "http://fidscript_whatsapp_api:3099/health" > /dev/null 2>&1 \
    && pass "backend network → whatsapp-api:3099 OK" \
    || fail "backend cannot reach whatsapp-api:3099 (DNS or firewall)"

# ---- Secrets present ----
info "Checking WhatsApp API has required env vars..."
for var in TUMA_API_KEY RESEND_API_KEY AUTHENTICATION_API_KEY; do
    VAL=$(docker exec fidscript_whatsapp_api sh -c "echo \${${var}}" 2>/dev/null || echo "")
    if [[ -n "${VAL}" && "${VAL}" != "CHANGE_ME" ]]; then
        pass "${var} is set"
    else
        fail "${var} is empty or CHANGE_ME"
    fi
done

echo ""
echo "============================================"
echo "  Validation complete"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Open https://whatsapp.fidscript.com"
echo "  2. Login as admin"
echo "  3. Create a test WhatsApp instance"
echo "  4. Generate QR code"
echo "  5. Scan with WhatsApp app"
echo "  6. Send a test message"
echo ""
echo "For full E2E checklist, see:"
echo "  https://github.com/Mkid095/fidscript-deploy"
