#!/bin/bash
set -e

DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
STORAGE_PATH="/data/fidscript"
AUTO_SSL=true
CLOUDFLARE_API_TOKEN=""
SERVER_IP=""

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FIDScript Deploy - Setup Wizard                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "ERROR: This script must be run as root (use sudo)"
   exit 1
fi

# Detect OS
if [[ ! -f /etc/os-release ]]; then
    echo "ERROR: Cannot detect OS. This installer requires Ubuntu 22.04 or Debian 11+"
    exit 1
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    echo "WARNING: This installer is designed for Ubuntu/Debian."
    echo "Continuing anyway..."
fi

echo "Welcome to FIDScript Deploy Setup!"
echo ""
echo "This wizard will guide you through the initial configuration."
echo ""

# Domain configuration
read -p "Enter your platform domain (e.g., deploy.example.com): " DOMAIN
while [[ -z "$DOMAIN" ]]; do
    echo "Domain cannot be empty. Please enter a valid domain."
    read -p "Enter your platform domain (e.g., deploy.example.com): " DOMAIN
done

# Admin email
read -p "Enter admin email address: " ADMIN_EMAIL
while [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
    echo "Invalid email format. Please enter a valid email address."
    read -p "Enter admin email address: " ADMIN_EMAIL
done

# Admin password
read -sp "Enter admin password (min 12 characters): " ADMIN_PASSWORD
echo ""
while [[ ${#ADMIN_PASSWORD} -lt 12 ]]; do
    echo "Password must be at least 12 characters long."
    read -sp "Enter admin password (min 12 characters): " ADMIN_PASSWORD
    echo ""
done

# Storage path
read -p "Storage path [/data/fidscript]: " STORAGE_PATH_INPUT
STORAGE_PATH="${STORAGE_PATH_INPUT:-$STORAGE_PATH}"

# Cloudflare API token (for DNS-01 challenge + DNS management)
echo ""
read -p "Cloudflare API token (Zone:DNS:Edit for deploy.fidscript.com): " CLOUDFLARE_API_TOKEN
while [[ -z "$CLOUDFLARE_API_TOKEN" ]]; do
    echo "Cloudflare API token is required for DNS management."
    read -p "Cloudflare API token: " CLOUDFLARE_API_TOKEN
done

# Server public IP (auto-detected by install.sh and passed as $1)
DETECTED_IP="${1:-}"
if [[ -n "$DETECTED_IP" ]]; then
    read -p "This server's public IP address [${DETECTED_IP}]: " SERVER_IP
    SERVER_IP="${SERVER_IP:-$DETECTED_IP}"
else
    read -p "This server's public IP address: " SERVER_IP
fi
while [[ -z "$SERVER_IP" || ! "$SERVER_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; do
    echo "A valid public IP address is required."
    read -p "This server's public IP address: " SERVER_IP
done

# Detect the host docker daemon socket's group GID. The api container runs as
# non-root `node` and needs to build/run user images via the mounted socket;
# compose `group_add: ["$DOCKER_GID"]` grants that access. Falls back to 0 if
# the docker group is absent (admin should set DOCKER_GID manually post-install).
DOCKER_GID="$(getent group docker | cut -d: -f3)"
[[ -z "$DOCKER_GID" ]] && DOCKER_GID=0
echo "  Detected docker socket GID: $DOCKER_GID"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Configuration Summary                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Domain:           $DOMAIN"
echo "  Admin Email:      $ADMIN_EMAIL"
echo "  Storage Path:     $STORAGE_PATH"
echo "  Auto SSL:         $AUTO_SSL"
echo "  Cloudflare Token: [configured]"
echo "  Server IP:        $SERVER_IP"
echo ""

read -p "Proceed with installation? [Y/n]: " CONFIRM
CONFIRM="${CONFIRM:-Y}"
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""
echo "Starting installation..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$INSTALL_DIR/docker"
TRAEFIK_DIR="$DOCKER_DIR/traefik"
SECRETS_DIR="$DOCKER_DIR/secrets"

# Create directories
mkdir -p "$SECRETS_DIR"
mkdir -p "$TRAEFIK_DIR/certs"

# Generate secrets
echo "Generating secure secrets..."
# Hex (not base64): URL-safe chars only, so values never break the
# Postgres/Redis connection strings they get substituted into.
openssl rand -hex 32 > "$SECRETS_DIR/postgres_password.txt"
openssl rand -hex 32 > "$SECRETS_DIR/redis_password.txt"
openssl rand -hex 32 > "$SECRETS_DIR/minio_access_key.txt"
openssl rand -hex 32 > "$SECRETS_DIR/minio_secret_key.txt"
openssl rand -hex 64 > "$SECRETS_DIR/jwt_secret.txt"
# Cloudflare API token for DNS management and Traefik ACME DNS-01 challenge
echo "$CLOUDFLARE_API_TOKEN" > "$SECRETS_DIR/cf_api_token.txt"
# Stalwart admin token for management API
openssl rand -hex 32 > "$SECRETS_DIR/stalwart_admin_token.txt"
# Stalwart webhook HMAC secret for inbound email/bounce webhooks
openssl rand -hex 32 > "$SECRETS_DIR/stalwart_webhook_secret.txt"
# Platform SMTP submission credentials (used for all outbound mail via API)
SMTP_SUBMISSION_USER="submission@$DOMAIN"
SMTP_SUBMISSION_PASS=$(openssl rand -hex 32)
echo "$SMTP_SUBMISSION_USER" > "$SECRETS_DIR/smtp_submission_user.txt"
echo "$SMTP_SUBMISSION_PASS" > "$SECRETS_DIR/smtp_submission_pass.txt"
# Stalwart credentials file for SMTP submission port auth (format: user password)
echo "$SMTP_SUBMISSION_USER $SMTP_SUBMISSION_PASS" > "$SECRETS_DIR/stalwart_credentials.txt"
# Password for system mailboxes (alert@, noreply@) provisioned by the api's
# EmailBootstrapService on boot. Stable across boots so operators can log in
# via IMAP; outbound mail authenticates with the admin token, not this.
SYSTEM_MAILBOX_PASSWORD=$(openssl rand -base64 24 | tr -d '/=' | head -c 32)
echo "$SYSTEM_MAILBOX_PASSWORD" > "$SECRETS_DIR/system_mailbox_password.txt"

# Set permissions
chmod 600 "$SECRETS_DIR/"*.txt

# Read secret values (needed for .env substitution, api.env, and pgbouncer userlist)
POSTGRES_PASSWORD=$(cat "$SECRETS_DIR/postgres_password.txt")
REDIS_PASSWORD=$(cat "$SECRETS_DIR/redis_password.txt")
MINIO_ACCESS_KEY=$(cat "$SECRETS_DIR/minio_access_key.txt")
MINIO_SECRET_KEY=$(cat "$SECRETS_DIR/minio_secret_key.txt")

# Generate pgbouncer userlist (plaintext — the standard, working pattern with
# auth_type=md5: pgbouncer validates the client against this entry and reuses
# the password to connect to postgres). The placeholder "md5CHANGEME" that
# previously shipped in the repo would cause every auth to fail.
cat > "$DOCKER_DIR/userlist.txt" << EOF
"fidscript" "${POSTGRES_PASSWORD}"
EOF
chmod 600 "$DOCKER_DIR/userlist.txt"

# Create .env in DOCKER_DIR — that's the CWD install.sh runs compose from,
# so docker compose auto-loads it for ${VAR} substitution. The four DB/cache
# credentials MUST be here (not only in api.env) because compose resolves
# ${POSTGRES_PASSWORD} etc. at parse time from .env, not from env_file.
cat > "$DOCKER_DIR/.env" << EOF
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
STORAGE_PATH=$STORAGE_PATH
AUTO_SSL=$AUTO_SSL
SERVER_IP=$SERVER_IP
PLATFORM_DOMAIN=$DOMAIN
PLATFORM_MAIL_HOST=mail.$DOMAIN
SMTP_SUBMISSION_USER=submission@$DOMAIN
SMTP_SUBMISSION_PASS=$SMTP_SUBMISSION_PASS
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_EXTERNAL_ENDPOINT=https://storage.$DOMAIN
# Host docker socket GID — granted to the api container (USER node) via group_add
# so the deployment worker can build/run user images against the host daemon.
DOCKER_GID=$DOCKER_GID
EOF

# Generate api.env with secret values (api container reads these via env_file)
cat > "$SECRETS_DIR/api.env" << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
SMTP_SUBMISSION_USER=$SMTP_SUBMISSION_USER
SMTP_SUBMISSION_PASS=$SMTP_SUBMISSION_PASS
SYSTEM_MAILBOX_PASSWORD=$SYSTEM_MAILBOX_PASSWORD
EOF

# Create DNS records for platform subdomains via Cloudflare API before Traefik starts
echo "Creating DNS records on Cloudflare..."
ZONE_RESULT=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN#*.}&status=active" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")
ZONE_ID=$(echo "$ZONE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'])" 2>/dev/null || echo "")

if [[ -z "$ZONE_ID" ]]; then
  echo "ERROR: Could not find Cloudflare zone for ${DOMAIN}. Check your API token permissions."
  exit 1
fi

# Create A records for core subdomains
for SUBDOMAIN in "deploy" "jmap" "storage"; do
  FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"
  echo "  Creating A record: ${FULL_DOMAIN} -> ${SERVER_IP}"
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"${FULL_DOMAIN}\",\"content\":\"${SERVER_IP}\",\"ttl\":3600,\"proxied\":false}" \
    | grep -q '"success":true' || echo "  WARNING: Failed to create ${FULL_DOMAIN}"
done

# Create wildcard A record for *.apps.$DOMAIN
echo "  Creating wildcard A record: *.apps.${DOMAIN} -> ${SERVER_IP}"
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"A\",\"name\":\"*.apps.${DOMAIN}\",\"content\":\"${SERVER_IP}\",\"ttl\":3600,\"proxied\":false}" \
  | grep -q '"success":true' || echo "  WARNING: Failed to create *.apps.${DOMAIN}"

echo "DNS records created."

# Generate Traefik dynamic.yml — double-quote heredoc allows $DOMAIN substitution
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
        certResolver: letsencrypt-dns

    # Prometheus /metrics endpoint (Phase 14) — must precede the dashboard catch-all.
    metrics:
      rule: "Host(\`${DOMAIN}\`) && PathPrefix(\`/metrics\`)"
      service: api
      middlewares:
        - security-headers
      tls:
        certResolver: letsencrypt-dns

    api:
      rule: "PathPrefix(\`/api\`)"
      service: api
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: letsencrypt-dns

    minio-console:
      rule: "Host(\`storage.${DOMAIN}\`)"
      service: minio-console
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: letsencrypt-dns

    # Stalwart JMAP / management HTTP — port 8443 inside container
    jmap:
      rule: "Host(\`jmap.${DOMAIN}\`)"
      service: stalwart-jmap
      middlewares:
        - security-headers
      tls:
        certResolver: letsencrypt-dns

    # ACME HTTP-01 challenge proxy — routes to Stalwart's internal ACME listener
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

# Generate Traefik static config with real email and ACME DNS-01 challenge
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

# ─────────────────────────────────────────────────────────────
# Certificate resolvers
# ─────────────────────────────────────────────────────────────
#
# 1. letsencrypt-dns — DNS-01 challenge via Cloudflare
#    Issues wildcards (*.apps.$DOMAIN) and any domain where we
#    control DNS. Requires CLOUDFLARE_API_TOKEN_FILE env var
#    (pointing to the mounted secret file) in the Traefik container.
#
# 2. letsencrypt-http — HTTP-01 challenge fallback
#    For custom domains where the user points their DNS CNAME
#    to our server IP but we don't control their zone.
#    Requires port 80 to be reachable from Let's Encrypt servers.
#
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
      # Production ACME endpoint — do not change
      caServer: https://acme-v02.api.letsencrypt.org/directory

  letsencrypt-http:
    acme:
      email: $ADMIN_EMAIL
      storage: /acme-http/acme-http.json
      httpChallenge:
        entryPoint: web
      # Production ACME endpoint — do not change
      caServer: https://acme-v02.api.letsencrypt.org/directory

providers:
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true
EOF

# Render Stalwart's config.toml from the template. Stalwart's binary
# does NOT do ${VAR} substitution, so the file on disk must already
# be the rendered version with the real MAIL_HOSTNAME baked in.
# Also: Stalwart's [authentication.fallback-admin] secret must be a
# bcrypt hash of the platform token — we read the token, hash it,
# and substitute the hash into the rendered config. The api uses the
# same plaintext token via STALWART_ADMIN_TOKEN, so they match.
STALWART_CONFIG_DIR="$(dirname "$SCRIPT_DIR")/config/stalwart"
if [[ -f "$STALWART_CONFIG_DIR/config.toml.template" ]]; then
  MAIL_HOSTNAME="mail.${DOMAIN}"
  # Bcrypt the admin token using the host's python3 (no need to
  # pull a python image at install time). The host almost always
  # has python3 since prisma + the api need it for migrations.
  STALWART_ADMIN_TOKEN_VALUE=$(cat "$SECRETS_DIR/stalwart_admin_token.txt")
  STALWART_ADMIN_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'${STALWART_ADMIN_TOKEN_VALUE}', bcrypt.gensalt()).decode())" 2>/dev/null || echo "PYTHON_BCRYPT_MISSING")
  if [[ "$STALWART_ADMIN_HASH" == "PYTHON_BCRYPT_MISSING" ]]; then
    echo "WARNING: python3 + bcrypt not available. Install python3-bcrypt and re-run,"
    echo "         or manually edit $STALWART_CONFIG_DIR/config.toml and set"
    echo "         [authentication.fallback-admin] secret = \"<bcrypt-hash>\"."
  fi
  sed "s|\${MAIL_HOSTNAME}|${MAIL_HOSTNAME}|g; s|\${DOMAIN}|${DOMAIN}|g; s|\${STALWART_ADMIN_HASH}|${STALWART_ADMIN_HASH}|g" \
    "$STALWART_CONFIG_DIR/config.toml.template" \
    > "$STALWART_CONFIG_DIR/config.toml"
  chmod 644 "$STALWART_CONFIG_DIR/config.toml"
  echo "Rendered Stalwart config for ${MAIL_HOSTNAME}"
else
  echo "WARNING: Stalwart config template not found at $STALWART_CONFIG_DIR/config.toml.template"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            Configuration saved successfully               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Domain:       $DOMAIN"
echo "  Admin email:  $ADMIN_EMAIL"
echo "  Server IP:    $SERVER_IP"
echo ""
echo "Secrets, Traefik, Stalwart, and DNS records have been generated."
echo "The installer will now build and start the stack, run migrations,"
echo "seed the admin account, and verify health — no manual steps needed."
echo ""