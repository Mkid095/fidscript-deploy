#!/bin/bash
# =============================================================================
# FIDScript Deploy — Setup Wizard
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m';   GREEN='\033[0;32m';   YELLOW='\033[1;33m'
CYAN='\033[0;36m';  BOLD='\033[1m';       DIM='\033[2m'
WHITE='\033[97m';   NC='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "  ${GREEN}✓${NC}  $1"; }
warn()    { echo -e "  ${YELLOW}!${NC}  $1"; }
error()   { echo -e "  ${RED}✗${NC}  $1" >&2; }
step()    { echo -e "\n  ${CYAN}▶${NC}  $1"; }
prompt()  { echo -ne "  ${WHITE}$1${NC}  "; }
title()   { echo -e "\n${BOLD}$1${NC}"; }
banner()  {
  echo ""
  echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}${WHITE}FIDScript Deploy — Setup Wizard${NC}"
  echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
}
divider() { echo -e "${DIM}$(printf '  ─%.0s' {1..64})${NC}"; }

# ── Defaults ────────────────────────────────────────────────────────────────────
DOMAIN=""; ADMIN_EMAIL=""; ADMIN_PASSWORD=""
STORAGE_PATH="/data/fidscript"
CLOUDFLARE_API_TOKEN=""; DNS_ZONE_ID=""
SERVER_IP=""; DETECTED_IP=""; DOCKER_GID="0"

# ── Detect environment ─────────────────────────────────────────────────────────
detect_env() {
  title "Environment"
  divider

  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    info "OS: $PRETTY_NAME ($ID)"
  else
    error "Cannot detect OS. Ubuntu 22.04+ or Debian 11+ required."
    exit 1
  fi

  DETECTED_IP="$(curl -s -m 8 https://api.ipify.org 2>/dev/null || \
                 curl -s -m 8 https://ifconfig.me 2>/dev/null || true)"
  if [[ -n "$DETECTED_IP" ]]; then
    info "Public IP: $DETECTED_IP (auto-detected)"
  else
    warn "Could not auto-detect public IP"
  fi

  DOCKER_GID="$(getent group docker 2>/dev/null | cut -d: -f3)" || DOCKER_GID="0"
  info "Docker GID: $DOCKER_GID"
}

# ── Step 1: Domain ───────────────────────────────────────────────────────────
step_domain() {
  title "Step 1 / 5 — Platform Domain"
  divider
  echo "  The domain where this platform will live. DNS A records will be"
  echo "  created automatically if using Cloudflare (Step 4)."
  echo ""
  prompt "Platform domain [${DETECTED_IP:-deploy.example.com}]: "
  read -r d
  d="${d:-${DETECTED_IP:-deploy.example.com}}"
  DOMAIN="$d"
  info "Domain: $DOMAIN"
}

# ── Step 2: Admin email ──────────────────────────────────────────────────────
step_email() {
  title "Step 2 / 5 — Administrator Account"
  divider
  echo "  Platform alerts and login username."
  echo ""
  prompt "Admin email: "
  read -r e
  while [[ ! "$e" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
    error "Invalid format."
    prompt "Admin email: "
    read -r e
  done
  ADMIN_EMAIL="$e"
  info "Admin email: $ADMIN_EMAIL"
}

# ── Step 3: Password ─────────────────────────────────────────────────────────
step_password() {
  title "Step 3 / 5 — Admin Password"
  divider
  echo "  Minimum 12 characters. Shown as dots."
  echo ""
  while true; do
    prompt "Password (min 12 chars): "
    read -r -s p1; echo ""
    [[ ${#p1} -lt 12 ]] && { error "Too short."; continue; }
    prompt "Confirm: "
    read -r -s p2; echo ""
    [[ "$p1" != "$p2" ]] && { error "Mismatch."; continue; }
    ADMIN_PASSWORD="$p1"; break
  done
  info "Password set."
}

# ── Step 4: DNS provider ─────────────────────────────────────────────────────
step_dns() {
  title "Step 4 / 5 — DNS Provider  (optional)"
  divider
  echo "  Cloudflare is optional. Without it, SSL certificates use HTTP-01"
  echo "  challenge — you must create DNS A records manually before running."
  echo ""
  echo "  For Cloudflare: Zone / DNS / Edit token at:"
  echo "  https://dash.cloudflare.com/profile/api-tokens"
  echo ""
  prompt "Cloudflare API token [Enter to skip]: "
  read -r -s cf; echo ""
  if [[ -z "$cf" ]]; then
    info "Cloudflare skipped — using HTTP-01 for SSL (manual DNS required)"
    CLOUDFLARE_API_TOKEN=""
    return
  fi
  CLOUDFLARE_API_TOKEN="$cf"

  step "Validating token..."
  ZONE_RESULT=$(curl -s -m 10 -X GET \
    "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN#*.}&status=active" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")
  DNS_ZONE_ID=$(echo "$ZONE_RESULT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('result',[{}])[0].get('id',''))" 2>/dev/null)
  if [[ -z "$DNS_ZONE_ID" ]]; then
    warn "Token invalid or no zone found. Check permissions."
    warn "Continuing without Cloudflare — create DNS records manually."
    CLOUDFLARE_API_TOKEN=""; DNS_ZONE_ID=""
    return
  fi
  info "Token validated."
}

# ── Step 5: Review ───────────────────────────────────────────────────────────
step_review() {
  title "Step 5 / 5 — Review"
  divider
  echo "  Domain:       $DOMAIN"
  echo "  Admin:       $ADMIN_EMAIL"
  echo "  Storage:     $STORAGE_PATH"
  if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
    echo -e "  DNS:         ${GREEN}Cloudflare (auto)${NC}"
  else
    echo -e "  DNS:         ${YELLOW}Manual (HTTP-01 SSL)${NC}"
  fi
  echo "  Server IP:   ${DETECTED_IP:-[unknown]}"
  echo ""
  prompt "Deploy now? [Y/n]: "
  read -r c; c="${c:-Y}"
  [[ ! "$c" =~ ^[Yy]$ ]] && { echo "Cancelled."; exit 0; }
}

# ── Banner ────────────────────────────────────────────────────────────────────
banner
echo -e "  ${DIM}Creates a full deployment platform on this server in ~5 minutes.${NC}"
echo ""

# ── Wizard ──────────────────────────────────────────────────────────────────
detect_env
step_domain
step_email
step_password
step_dns
step_review

# ── Generate secrets ────────────────────────────────────────────────────────
title "Generating secrets"
step "Creating credentials..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")/docker"
SECRETS_DIR="$DOCKER_DIR/secrets"
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

# ── Load values ─────────────────────────────────────────────────────────────
POSTGRES_PASSWORD="$(cat "$SECRETS_DIR/postgres_password.txt")"
REDIS_PASSWORD="$(cat "$SECRETS_DIR/redis_password.txt")"
MINIO_ACCESS_KEY="$(cat "$SECRETS_DIR/minio_access_key.txt")"
MINIO_SECRET_KEY="$(cat "$SECRETS_DIR/minio_secret_key.txt")"

# ── Write .env ──────────────────────────────────────────────────────────────
title "Writing configuration"
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

# ── pgbouncer userlist ─────────────────────────────────────────────────────
cat > "$DOCKER_DIR/userlist.txt" << EOF
"fidscript" "${POSTGRES_PASSWORD}"
EOF
chmod 600 "$DOCKER_DIR/userlist.txt"
info ".env written."

# ── Cloudflare DNS ──────────────────────────────────────────────────────────
if [[ -n "$CLOUDFLARE_API_TOKEN" && -n "$DNS_ZONE_ID" ]]; then
  title "Creating DNS records"
  for sub in app jmap storage mail; do
    FULL="${sub}.${DOMAIN}"
    RESULT=$(curl -s -X POST \
      "https://api.cloudflare.com/client/v4/zones/${DNS_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"A\",\"name\":\"${FULL}\",\"content\":\"${DETECTED_IP}\",\"ttl\":3600,\"proxied\":false}")
    echo "$RESULT" | grep -q '"success":true' \
      && info "DNS: ${FULL} → ${DETECTED_IP}" \
      || warn "DNS: ${FULL} — failed"
  done

  RESULT=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${DNS_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"*.${DOMAIN}\",\"content\":\"${DETECTED_IP}\",\"ttl\":3600,\"proxied\":false}")
  echo "$RESULT" | grep -q '"success":true' \
    && info "DNS: *.${DOMAIN} → ${DETECTED_IP}" \
    || warn "DNS: wildcard failed"

  RESULT=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${DNS_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"MX\",\"name\":\"${DOMAIN}\",\"content\":\"mail.${DOMAIN}\",\"ttl\":3600,\"proxied\":false,\"priority\":10}")
  echo "$RESULT" | grep -q '"success":true' \
    && info "DNS: MX ${DOMAIN} → mail.${DOMAIN}" \
    || warn "DNS: MX failed"
else
  title "Skipping Cloudflare DNS"
  info "Skipped — create these DNS records manually before deploying:"
  echo "    A    deploy.${DOMAIN}     → ${DETECTED_IP}"
  echo "    A    app.${DOMAIN}       → ${DETECTED_IP}"
  echo "    A    jmap.${DOMAIN}      → ${DETECTED_IP}"
  echo "    A    storage.${DOMAIN}   → ${DETECTED_IP}"
  echo "    A    mail.${DOMAIN}      → ${DETECTED_IP}"
  echo "    A    *.${DOMAIN}         → ${DETECTED_IP}"
  echo "    MX   ${DOMAIN}           → mail.${DOMAIN}"
fi

# ── Traefik config ──────────────────────────────────────────────────────────
title "Writing Traefik configuration"
TRAEFIK_DIR="$DOCKER_DIR/traefik"
mkdir -p "$TRAEFIK_DIR/certs"

if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
  CERT_RESOLVER="letsencrypt-dns"
else
  CERT_RESOLVER="letsencrypt-http"
fi

cat > "$TRAEFIK_DIR/dynamic.yml" << HEREDOC
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        browserXssFilter: true
        contentTypeNosniff: true
        sslRedirect: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
    compress:
      compress: {}
  routers:
    dashboard:
      rule: "Host(\`${DOMAIN}\`) && !PathPrefix(\`/api\`) && !PathPrefix(\`/metrics\`)"
      service: dashboard
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: ${CERT_RESOLVER}
    deployments-wildcard:
      rule: "HostRegexp(\`^.+\\.${DOMAIN}$\`)"
      service: api
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: ${CERT_RESOLVER}
    metrics:
      rule: "Host(\`${DOMAIN}\`) && PathPrefix(\`/metrics\`)"
      service: api
      middlewares:
        - security-headers
      tls:
        certResolver: ${CERT_RESOLVER}
    api:
      rule: "PathPrefix(\`/api\`) && !Path(\`/install.sh\`)"
      service: api
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: ${CERT_RESOLVER}
    install-sh:
      rule: "Path(\`/install.sh\`)"
      service: api
      priority: 200
    minio-console:
      rule: "Host(\`storage.${DOMAIN}\`)"
      service: minio-console
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: ${CERT_RESOLVER}
    jmap:
      rule: "Host(\`jmap.${DOMAIN}\`)"
      service: stalwart-jmap
      middlewares:
        - security-headers
      tls:
        certResolver: ${CERT_RESOLVER}
    acme-challenge:
      rule: "PathPrefix(\`/.well-known/acme-challenge/\`)"
      service: stalwart-acme
      middlewares:
        - security-headers
  services:
    dashboard:
      loadBalancer:
        servers:
          - url: "http://fidscript_dashboard:3001"
    api:
      loadBalancer:
        servers:
          - url: "http://fidscript_api:3001"
    minio-console:
      loadBalancer:
        servers:
          - url: "http://fidscript_minio:9001"
    stalwart-jmap:
      loadBalancer:
        servers:
          - url: "http://fidscript_stalwart:8080"
    stalwart-acme:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8080"
HEREDOC
info "Traefik dynamic config written (resolver: $CERT_RESOLVER)."

# ── Traefik static ─────────────────────────────────────────────────────────
cat > "$TRAEFIK_DIR/traefik.yml" << EOF
api:
  dashboard: true
  insecure: true
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
certificatesResolvers:
  letsencrypt-dns:
    acme:
      email: $ADMIN_EMAIL
      storage: /acme-dns/acme-dns.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1"
          - "1.0.0.1"
      caServer: https://acme-v02.api.letsencrypt.org/directory
  letsencrypt-http:
    acme:
      email: $ADMIN_EMAIL
      storage: /acme-http/acme-http.json
      httpChallenge:
        entryPoint: web
      caServer: https://acme-v02.api.letsencrypt.org/directory
providers:
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true
EOF

# ── Stalwart config ─────────────────────────────────────────────────────────
STALWART_CONFIG_DIR="$(dirname "$SCRIPT_DIR")/config/stalwart"
if [[ -f "$STALWART_CONFIG_DIR/config.toml.template" ]]; then
  step "Rendering Stalwart config..."
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
    info "Stalwart config rendered."
  else
    warn "python3-bcrypt not available — Stalwart admin hash skipped."
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║${NC}  ${BOLD}${WHITE}Configuration saved — ready to deploy${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}To start the platform:${NC}"
echo -e "  ${CYAN}  cd $DOCKER_DIR && sudo docker compose up -d --build${NC}"
echo ""
