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
openssl rand -base64 32 > "$SECRETS_DIR/postgres_password.txt"
openssl rand -base64 32 > "$SECRETS_DIR/redis_password.txt"
openssl rand -base64 32 > "$SECRETS_DIR/minio_access_key.txt"
openssl rand -base64 32 > "$SECRETS_DIR/minio_secret_key.txt"
openssl rand -base64 64 > "$SECRETS_DIR/jwt_secret.txt"
# Cloudflare API token for DNS management and Traefik ACME DNS-01 challenge
echo "$CLOUDFLARE_API_TOKEN" > "$SECRETS_DIR/cf_api_token.txt"
# Stalwart admin token for management API
openssl rand -base64 32 > "$SECRETS_DIR/stalwart_admin_token.txt"
# Stalwart webhook HMAC secret for inbound email/bounce webhooks
openssl rand -base64 32 > "$SECRETS_DIR/stalwart_webhook_secret.txt"

# Set permissions
chmod 600 "$SECRETS_DIR/"*.txt

# Create .env
cat > "$INSTALL_DIR/.env" << EOF
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
STORAGE_PATH=$STORAGE_PATH
AUTO_SSL=$AUTO_SSL
SERVER_IP=$SERVER_IP
PLATFORM_DOMAIN=deploy.fidscript.com
EOF

# Generate api.env with secret values (api container reads these via env_file)
POSTGRES_PASSWORD=$(cat "$SECRETS_DIR/postgres_password.txt")
REDIS_PASSWORD=$(cat "$SECRETS_DIR/redis_password.txt")
MINIO_ACCESS_KEY=$(cat "$SECRETS_DIR/minio_access_key.txt")
MINIO_SECRET_KEY=$(cat "$SECRETS_DIR/minio_secret_key.txt")

cat > "$SECRETS_DIR/api.env" << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
EOF

# Generate Traefik dynamic.yml with the real domain
cat > "$TRAEFIK_DIR/dynamic.yml" << EOF
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
      rule: "Host(\`$DOMAIN\`)"
      service: dashboard
      middlewares:
        - security-headers
        - compress
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
      rule: "Host(\`storage.$DOMAIN\`)"
      service: minio-console
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: letsencrypt-dns

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
EOF

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