#!/bin/bash
# =============================================================================
# FIDScript Deploy — Setup Wizard
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m';   GREEN='\033[0;32m';   YELLOW='\033[1;33m'
CYAN='\033[0;36m';  BOLD='\033[1m';       DIM='\033[2m'
NC='\033[0m';       WHITE='\033[97m'

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "  ${GREEN}✓${NC}  $1"; }
warn()    { echo -e "  ${YELLOW}!${NC}  $1"; }
error()   { echo -e "  ${RED}✗${NC}  $1"; }
step()    { echo -e "\n  ${CYAN}▶${NC}  $1"; }
prompt()  { echo -ne "  ${WHITE}$1${NC}  "; }
title()   { echo -e "\n${BOLD}$1${NC}"; }
banner()  {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}${WHITE}$1${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
}
divider() { echo -e "${DIM}$(printf '  ─%.0s' {1..64})${NC}"; }

# ── Defaults ────────────────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-}"; ADMIN_EMAIL="${ADMIN_EMAIL:-}"; ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
STORAGE_PATH="/data/fidscript"; AUTO_SSL="true"; CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
SERVER_IP="${1:-}"; DETECTED_IP=""; DOCKER_GID=""; STALWART_ADMIN_TOKEN=""
CONFIRM_YES="false"

# ── Detect environment ─────────────────────────────────────────────────────────
detect_env() {
  title "Environment"

  # OS
  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    info "OS:     ${PRETTY_NAME} ($ID)"
  else
    error "Cannot detect OS. This installer requires Ubuntu 22.04+ or Debian 11+"
    exit 1
  fi

  # Public IP
  DETECTED_IP="$(curl -s -m 8 https://api.ipify.org 2>/dev/null || \
                 curl -s -m 8 https://ifconfig.me 2>/dev/null || true)"
  if [[ -n "$DETECTED_IP" ]]; then
    info "IP:     ${DETECTED_IP} (auto-detected)"
  else
    warn "Could not auto-detect public IP — you will be asked to enter it"
    DETECTED_IP=""
  fi

  # Docker GID
  DOCKER_GID="$(getent group docker 2>/dev/null | cut -d: -f3)" || DOCKER_GID=""
  if [[ -n "$DOCKER_GID" ]]; then
    info "Docker GID: $DOCKER_GID"
  else
    info "Docker GID: none found (DOCKER_GID=0 used as fallback)"
    DOCKER_GID="0"
  fi
}

# ── Step 1: Domain ───────────────────────────────────────────────────────────
step_domain() {
  title "Step 1 of 5 — Platform Domain"
  divider
  echo "  Enter the domain where this platform will live."
  echo "  A and MX DNS records will be created automatically."
  echo ""
  prompt "Platform domain [${DETECTED_IP:-deploy.example.com}]: "
  read -r d
  d="${d:-${DETECTED_IP:-deploy.example.com}}"
  DOMAIN="$d"
  info "Domain set: $DOMAIN"
}

# ── Step 2: Admin email ──────────────────────────────────────────────────────
step_email() {
  title "Step 2 of 5 — Administrator Account"
  divider
  echo "  This email receives platform alerts and is your login username."
  echo ""
  prompt "Admin email: "
  read -r e
  while [[ ! "$e" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
    error "Invalid format. Enter a valid email address."
    prompt "Admin email: "
    read -r e
  done
  ADMIN_EMAIL="$e"
  info "Admin email: $ADMIN_EMAIL"
}

# ── Step 3: Admin password ────────────────────────────────────────────────────
step_password() {
  title "Step 3 of 5 — Admin Password"
  divider
  echo "  Minimum 12 characters. Shown as dots — no echo."
  echo ""
  while true; do
    prompt "Admin password (min 12 chars): "
    read -r -s p1; echo ""
    if [[ ${#p1} -lt 12 ]]; then
      error "Password must be at least 12 characters."
      continue
    fi
    prompt "Confirm password: "
    read -r -s p2; echo ""
    if [[ "$p1" != "$p2" ]]; then
      error "Passwords do not match. Try again."
      continue
    fi
    ADMIN_PASSWORD="$p1"
    break
  done
  info "Password set."
}

# ── Step 4: Cloudflare token ─────────────────────────────────────────────────
step_cloudflare() {
  title "Step 4 of 5 — Cloudflare DNS"
  divider
  echo "  Required for automatic DNS and SSL certificate provisioning."
  echo "  Create a token at: https://dash.cloudflare.com/profile/api-tokens"
  echo "  Permission needed: Zone / Zone / DNS / Edit"
  echo ""
  if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
    info "Cloudflare token: [already set — ${CLOUDFLARE_API_TOKEN:0:8}...]"
    return
  fi
  prompt "Cloudflare API token: "
  read -r -s cf; echo ""
  while [[ -z "$cf" ]]; do
    error "Token is required for DNS management."
    prompt "Cloudflare API token: "
    read -r -s cf; echo ""
  done
  CLOUDFLARE_API_TOKEN="$cf"

  # Quick validation
  step "Validating token..."
  ZONE_RESULT=$(curl -s -m 10 -X GET \
    "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN#*.}&status=active" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")
  if ! echo "$ZONE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',[{}])[0].get('id',''))" 2>/dev/null | grep -qv '^$'; then
    error "Token validation failed. Check permissions and try again."
    CLOUDFLARE_API_TOKEN=""
    step_cloudflare
    return
  fi
  info "Token validated."
}

# ── Step 5: Review + confirm ─────────────────────────────────────────────────
step_review() {
  title "Step 5 of 5 — Review & Deploy"
  divider
  echo "  Domain:         $DOMAIN"
  echo "  Admin email:    $ADMIN_EMAIL"
  echo "  Storage path:   $STORAGE_PATH"
  echo "  Cloudflare:     [configured]"
  echo "  Server IP:      ${DETECTED_IP:-[will be detected]}"
  echo ""
  prompt "Deploy now? [Y/n]: "
  read -r confirm
  confirm="${confirm:-Y}"
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo ""
    warn "Installation cancelled. Run 'sudo fidscript setup' to restart."
    exit 0
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}${WHITE}FIDScript Deploy — Setup Wizard${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}This wizard creates a full-featured deployment platform on this${NC}"
echo -e "  ${DIM}server in under 5 minutes. No manual DNS or SSH required.${NC}"
echo ""

# ── Wizard steps ──────────────────────────────────────────────────────────────
detect_env
step_domain
step_email
step_password
step_cloudflare
step_review

# ── Generating secrets ────────────────────────────────────────────────────────
title "Generating platform secrets"
step "Creating secure credentials..."
SECRETS_DIR="$(cd "$(dirname "$0")" && pwd)/docker/secrets"
mkdir -p "$SECRETS_DIR"

openssl rand -hex 32 > "$SECRETS_DIR/postgres_password.txt"
openssl rand -hex 32 > "$SECRETS_DIR/redis_password.txt"
openssl rand -hex 32 > "$SECRETS_DIR/minio_access_key.txt"
openssl rand -hex 32 > "$SECRETS_DIR/minio_secret_key.txt"
openssl rand -hex 64 > "$SECRETS_DIR/jwt_secret.txt"
openssl rand -hex 32 > "$SECRETS_DIR/stalwart_admin_token.txt"
openssl rand -hex 32 > "$SECRETS_DIR/stalwart_webhook_secret.txt"
STALWART_ADMIN_TOKEN="$(cat "$SECRETS_DIR/stalwart_admin_token.txt")"
SYSTEM_MAILBOX_PASSWORD="$(openssl rand -base64 24 | tr -d '/=' | head -c 32)"
echo "$SYSTEM_MAILBOX_PASSWORD" > "$SECRETS_DIR/system_mailbox_password.txt"
echo "$CLOUDFLARE_API_TOKEN" > "$SECRETS_DIR/cf_api_token.txt"
echo "admin" > "$SECRETS_DIR/smtp_submission_user.txt"
echo "$STALWART_ADMIN_TOKEN" > "$SECRETS_DIR/smtp_submission_pass.txt"
echo "admin $STALWART_ADMIN_TOKEN" > "$SECRETS_DIR/stalwart_credentials.txt"
chmod 600 "$SECRETS_DIR"/*.txt
info "Secrets generated."

# ── Loading secret values ───────────────────────────────────────────────────────
POSTGRES_PASSWORD="$(cat "$SECRETS_DIR/postgres_password.txt")"
REDIS_PASSWORD="$(cat "$SECRETS_DIR/redis_password.txt")"
MINIO_ACCESS_KEY="$(cat "$SECRETS_DIR/minio_access_key.txt")"
MINIO_SECRET_KEY="$(cat "$SECRETS_DIR/minio_secret_key.txt")"

# ── Writing .env ─────────────────────────────────────────────────────────────
title "Writing configuration"
DOCKER_DIR="$(cd "$(dirname "$0")" && pwd)/docker"
cat > "$DOCKER_DIR/.env" << ENVEOF
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
STORAGE_PATH=$STORAGE_PATH
SERVER_IP=${DETECTED_IP:-$SERVER_IP}
PLATFORM_DOMAIN=$DOMAIN
PLATFORM_MAIL_HOST=mail.$DOMAIN
SMTP_SUBMISSION_USER=admin
SMTP_SUBMISSION_PASS=$STALWART_ADMIN_TOKEN
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_EXTERNAL_ENDPOINT=https://storage.$DOMAIN
DOCKER_GID=$DOCKER_GID
ENVEOF

cat > "$SECRETS_DIR/api.env" << APIENV
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
SMTP_SUBMISSION_USER=admin
SMTP_SUBMISSION_PASS=$STALWART_ADMIN_TOKEN
SYSTEM_MAILBOX_PASSWORD=$SYSTEM_MAILBOX_PASSWORD
APIENV
chmod 600 "$SECRETS_DIR/api.env"
info ".env written."

# ── pgbouncer userlist ───────────────────────────────────────────────────────
cat > "$DOCKER_DIR/userlist.txt" << EOF
"fidscript" "${POSTGRES_PASSWORD}"
EOF
chmod 600 "$DOCKER_DIR/userlist.txt"

# ── Cloudflare DNS ───────────────────────────────────────────────────────────
title "Configuring DNS"
step "Creating DNS records on Cloudflare..."
ZONE_RESULT=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN#*.}&status=active" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")
ZONE_ID=$(echo "$ZONE_RESULT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('result',[{}])[0].get('id',''))" 2>/dev/null)

if [[ -z "$ZONE_ID" ]]; then
  error "Could not find Cloudflare zone for ${DOMAIN#*.}. Check token permissions."
  exit 1
fi

for sub in "app" "jmap" "storage" "mail"; do
  FULL="${sub}.${DOMAIN}"
  RESULT=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"${FULL}\",\"content\":\"${DETECTED_IP}\",\"ttl\":3600,\"proxied\":false}")
  if echo "$RESULT" | grep -q '"success":true'; then
    info "DNS: ${FULL} → ${DETECTED_IP}"
  else
    warn "DNS: ${FULL} — create manually or check token permissions"
  fi
done

# Wildcard for deployment subdomains
RESULT=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"A\",\"name\":\"*.${DOMAIN}\",\"content\":\"${DETECTED_IP}\",\"ttl\":3600,\"proxied\":false}")
echo "$RESULT" | grep -q '"success":true' \
  && info "DNS: *.${DOMAIN} → ${DETECTED_IP}" \
  || warn "DNS: *.${DOMAIN} — wildcard record failed"

# MX for mail
RESULT=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"MX\",\"name\":\"${DOMAIN}\",\"content\":\"mail.${DOMAIN}\",\"ttl\":3600,\"proxied\":false,\"priority\":10}")
echo "$RESULT" | grep -q '"success":true' \
  && info "DNS: MX ${DOMAIN} → mail.${DOMAIN}" \
  || warn "DNS: MX record failed"

# ── Stalwart bcrypt hash ─────────────────────────────────────────────────────
STALWART_CONFIG_DIR="$(dirname "$0")/config/stalwart"
STALWART_ADMIN_HASH=""
if [[ -f "$STALWART_CONFIG_DIR/config.toml.template" ]]; then
  step "Computing Stalwart admin hash..."
  STALWART_ADMIN_HASH=$(
    python3 -c "
import bcrypt
token = '''${STALWART_ADMIN_TOKEN}'''.encode()
print(bcrypt.hashpw(token, bcrypt.gensalt()).decode())
" 2>/dev/null
  )
  if [[ -n "$STALWART_ADMIN_HASH" ]]; then
    sed "s|\${MAIL_HOSTNAME}|mail.${DOMAIN}|g; s|\${DOMAIN}|${DOMAIN}|g; s|\${STALWART_ADMIN_HASH}|${STALWART_ADMIN_HASH}|g" \
      "$STALWART_CONFIG_DIR/config.toml.template" \
      > "$STALWART_CONFIG_DIR/config.toml"
    chmod 644 "$STALWART_CONFIG_DIR/config.toml"
    info "Stalwart config rendered for mail.${DOMAIN}"
  else
    warn "python3-bcrypt not available — Stalwart admin hash skipped"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║${NC}  ${BOLD}${WHITE}Configuration saved — ready to deploy.${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Run the following to start the platform:${NC}"
echo -e "  ${CYAN}  cd $(dirname "$0")/docker && sudo docker compose up -d --build${NC}"
echo ""
echo -e "  ${DIM}Or use the full installer:${NC}"
echo -e "  ${CYAN}  sudo fidscript install${NC}"
echo ""
