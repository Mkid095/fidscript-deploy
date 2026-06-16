#!/bin/bash
set -e

DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
STORAGE_PATH="/data/fidscript"
AUTO_SSL=true

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

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Configuration Summary                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Domain:        $DOMAIN"
echo "  Admin Email:   $ADMIN_EMAIL"
echo "  Storage Path:  $STORAGE_PATH"
echo "  Auto SSL:      $AUTO_SSL"
echo ""

read -p "Proceed with installation? [Y/n]: " CONFIRM
CONFIRM="${CONFIRM:-Y}"
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""
echo "Starting installation..."

# Create secrets directory
mkdir -p "$(dirname "$0")/../docker/secrets"
mkdir -p "$(dirname "$0")/../docker/traefik/certs"

# Generate secrets
echo "Generating secure secrets..."
openssl rand -base64 32 > "$(dirname "$0")/../docker/secrets/postgres_password.txt"
openssl rand -base64 32 > "$(dirname "$0")/../docker/secrets/redis_password.txt"
openssl rand -base64 32 > "$(dirname "$0")/../docker/secrets/minio_access_key.txt"
openssl rand -base64 32 > "$(dirname "$0")/../docker/secrets/minio_secret_key.txt"
openssl rand -base64 64 > "$(dirname "$0")/../docker/secrets/jwt_secret.txt"

# Set permissions
chmod 600 "$(dirname "$0")/../docker/secrets/"*.txt

# Create config file
cat > "$(dirname "$0")/../.env" << EOF
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
STORAGE_PATH=$STORAGE_PATH
AUTO_SSL=$AUTO_SSL
EOF

echo ""
echo "Configuration saved to .env"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Installation Complete!                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Review .env file and adjust if needed"
echo "  2. Run: cd installer/docker && docker compose up -d"
echo "  3. Access dashboard at: https://$DOMAIN"
echo ""
