#!/bin/bash
set -e

INSTALLER_VERSION="1.0.0"
INSTALLER_URL="https://install.fidscript.dev"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FIDScript Deploy Installer v${INSTALLER_VERSION}                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        OS="$ID"
        OS_VERSION="$VERSION_ID"
    else
        log_error "Cannot detect OS. This installer requires Ubuntu 22.04 or Debian 11+"
        exit 1
    fi

    case "$OS" in
        ubuntu)
            if [[ "$OS_VERSION" != "22.04" && "$OS_VERSION" != "24.04" ]]; then
                log_warn "This installer is designed for Ubuntu 22.04/24.04. You have: $OS_VERSION"
            fi
            ;;
        debian)
            if [[ "$OS_VERSION" != "11" && "$OS_VERSION" != "12" ]]; then
                log_warn "This installer is designed for Debian 11/12. You have: $OS_VERSION"
            fi
            ;;
        *)
            log_warn "Unsupported OS: $OS. This installer is designed for Ubuntu/Debian."
            ;;
    esac
}

# Check prerequisites
check_prereqs() {
    log_info "Checking prerequisites..."

    local missing=()

    # Check for docker
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    # Check for docker compose
    if ! docker compose version &> /dev/null 2>&1; then
        if ! docker-compose version &> /dev/null 2>&1; then
            missing+=("docker-compose")
        fi
    fi

    # Check for curl
    if ! command -v curl &> /dev/null; then
        missing+=("curl")
    fi

    # Check for openssl
    if ! command -v openssl &> /dev/null; then
        missing+=("openssl")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Installing missing dependencies..."
        install_deps
    fi

    # Check docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi

    log_info "All prerequisites met."
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get update -qq
        apt-get install -y -qq curl openssl ca-certificates lsb-release > /dev/null 2>&1

        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            log_info "Installing Docker..."
            curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
            systemctl enable docker > /dev/null 2>&1 || true
        fi

        # Install Docker Compose if not present
        if ! docker compose version &> /dev/null 2>&1 && ! docker-compose version &> /dev/null 2>&1; then
            log_info "Installing Docker Compose..."
            curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
    fi

    log_info "Dependencies installed."
}

# Create installation directory
create_dirs() {
    log_info "Creating installation directories..."
    INSTALL_DIR="/opt/fidscript"
    mkdir -p "$INSTALL_DIR"
    mkdir -p "/data/fidscript"
    mkdir -p "/data/fidscript/{postgres,redis,nats,minio,stalwart}"
    log_info "Installation directory: $INSTALL_DIR"
}

# Download installer files
download_files() {
    log_info "Downloading FIDScript Deploy files..."

    # In production, this would download from the official source
    # For now, we'll use the local files
    if [[ -d "/home/$(whoami)/fidscript-deploy/installer" ]]; then
        log_info "Using local installer files..."
        cp -r /home/$(whoami)/fidscript-deploy/installer/* "$INSTALL_DIR/"
    else
        log_error "Cannot find installer files. Please ensure FIDScript Deploy is checked out."
        exit 1
    fi

    # Create symlink for easy updates
    ln -sfn "$INSTALL_DIR" /usr/local/bin/fidscript 2>/dev/null || true
}

# Run setup wizard
run_setup() {
    log_info "Starting setup wizard..."
    chmod +x "$INSTALL_DIR/scripts/setup-wizard.sh"
    "$INSTALL_DIR/scripts/setup-wizard.sh"
}

# Final verification
verify_installation() {
    log_info "Verifying installation..."

    local errors=0

    # Check Docker network
    if docker network ls | grep -q fidscript; then
        log_info "Docker network: OK"
    else
        log_warn "Docker network 'fidscript' not found. Run 'docker compose up -d' to create it."
    fi

    # Check secrets
    if [[ -f "$INSTALL_DIR/docker/secrets/postgres_password.txt" ]]; then
        log_info "Secrets: OK"
    else
        log_warn "Secrets not found. Run setup-wizard.sh to generate them."
    fi

    echo ""
    log_info "Installation verification complete."
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║              Installation Complete!                       ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Next steps:"
    echo "  1. cd $INSTALL_DIR/docker"
    echo "  2. docker compose up -d"
    echo "  3. Access your dashboard at https://$(grep DOMAIN "$INSTALL_DIR/.env" | cut -d= -f2)"
    echo ""
}

# Main installation flow
main() {
    detect_os
    check_prereqs
    create_dirs
    download_files
    run_setup
    verify_installation
}

main "$@"
