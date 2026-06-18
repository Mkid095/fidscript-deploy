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

# Server public IP
read -p "This server's public IP address: " SERVER_IP
while [[ -z "$SERVER_IP" || ! "$SERVER_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; do
    echo "A valid public IP address is required."
    read -p "This server's public IP address: " SERVER_IP
done

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
PLATFORM_DOMAIN=deploy.fidscript.com
PLATFORM_MAIL_HOST=mail.$DOMAIN
SMTP_SUBMISSION_USER=submission@$DOMAIN
SMTP_SUBMISSION_PASS=$SMTP_SUBMISSION_PASS
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_EXTERNAL_ENDPOINT=https://storage.$DOMAIN
EOF

# Generate api.env with secret values (api container reads these via env_file)
cat > "$SECRETS_DIR/api.env" << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
SMTP_SUBMISSION_USER=$SMTP_SUBMISSION_USER
SMTP_SUBMISSION_PASS=$SMTP_SUBMISSION_PASS
EOF

# Generate Traefik dynamic.yml with the real domain + Stalwart routes
cat > "$TRAEFIK_DIR/dynamic.yml" << 'HEREDOC'
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
      rule: "Host(`deploy.fidscript.com`)"
      service: dashboard
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: letsencrypt-dns

    api:
      rule: "PathPrefix(`/api`)"
      service: api
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: letsencrypt-dns

    minio-console:
      rule: "Host(`storage.deploy.fidscript.com`)"
      service: minio-console
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: letsencrypt-dns

    # Stalwart JMAP / management HTTP — port 8443 inside container
    jmap:
      rule: "Host(`jmap.deploy.fidscript.com`)"
      service: stalwart-jmap
      middlewares:
        - security-headers
      tls:
        certResolver: letsencrypt-dns

    # Stalwart IMAPS — port 993 inside container
    imap:
      rule: "Host(`imap.deploy.fidscript.com`)"
      service: stalwart-imap
      middlewares:
        - security-headers
      tls:
        certResolver: letsencrypt-dns

    # ACME HTTP-01 challenge proxy — routes to Stalwart's internal ACME listener
    acme-challenge:
      rule: "PathPrefix(`/.well-known/acme-challenge/`)"
      service: stalwart-acme
      middlewares:
        - security-headers

  services:
    dashboard:
      loadBalancer:
        servers:
          - url: "http://fidscript_dashboard:3000"

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
          - url: "http://fidscript_stalwart:8443"

    stalwart-imap:
      loadBalancer:
        servers:
          - url: "http://fidscript_stalwart:993"

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
#    Issues wildcards (*.apps.deploy.fidscript.com) and any
#    domain where we control DNS (deploy.fidscript.com zone).
#    Requires CF_API_TOKEN env var in the Traefik container.
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
      # Use staging while iterating to avoid rate limits
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory

  letsencrypt-http:
    acme:
      email: $ADMIN_EMAIL
      storage: /acme-http/acme-http.json
      httpChallenge:
        entryPoint: web
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: fidscript
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
echo "║              Installation Complete!                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Domain:       https://$DOMAIN"
echo "  Admin email:  $ADMIN_EMAIL"
echo ""
echo "Next steps:"
echo "  1. cd $DOCKER_DIR"
echo "  2. docker compose up -d --build"
echo "  3. docker compose exec api npx prisma migrate deploy"
echo "  4. docker compose exec api pnpm db:seed"
echo "  5. Access dashboard at: https://$DOMAIN"
echo ""