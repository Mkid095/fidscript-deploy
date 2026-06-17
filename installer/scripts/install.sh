#!/bin/bash
set -e

INSTALLER_VERSION="1.0.0"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FIDScript Deploy Installer v${INSTALLER_VERSION}                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

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

    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    if ! docker compose version &> /dev/null 2>&1; then
        if ! docker-compose version &> /dev/null 2>&1; then
            missing+=("docker-compose")
        fi
    fi

    if ! command -v curl &> /dev/null; then
        missing+=("curl")
    fi

    if ! command -v openssl &> /dev/null; then
        missing+=("openssl")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Installing missing dependencies..."
        install_deps
    fi

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

        if ! command -v docker &> /dev/null; then
            log_info "Installing Docker..."
            curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
            systemctl enable docker > /dev/null 2>&1 || true
        fi

        if ! docker compose version &> /dev/null 2>&1 && ! docker-compose version &> /dev/null 2>&1; then
            log_info "Installing Docker Compose..."
            curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
    fi

    log_info "Dependencies installed."
}

# Create installation directory and data dirs
create_dirs() {
    log_info "Creating installation directories..."
    INSTALL_DIR="/opt/fidscript"
    mkdir -p "$INSTALL_DIR"
    # Fixed: mkdir args must be unquoted for brace expansion to work
    mkdir -p /data/fidscript/postgres /data/fidscript/redis /data/fidscript/nats /data/fidscript/minio /data/fidscript/stalwart
    log_info "Installation directory: $INSTALL_DIR"
}

# Download or copy installer files
download_files() {
    log_info "Copying FIDScript Deploy files..."

    # Prefer local repo (dev/test path); otherwise this script is the canonical installer
    local src_dir=""
    if [[ -d "/opt/fidscript-deploy/installer" ]]; then
        src_dir="/opt/fidscript-deploy"
    elif [[ -d "/root/fidscript-deploy/installer" ]]; then
        src_dir="/root/fidscript-deploy"
    fi

    if [[ -n "$src_dir" ]]; then
        log_info "Using local source at $src_dir..."
        cp -r "$src_dir/installer" "$INSTALL_DIR/"
    else
        log_error "No source found. Please ensure FIDScript Deploy is checked out at /opt/fidscript-deploy or /root/fidscript-deploy"
        exit 1
    fi

    # Symlink for easy updates
    ln -sfn "$INSTALL_DIR" /usr/local/bin/fidscript 2>/dev/null || true
}

# Run setup wizard
run_setup() {
    log_info "Starting setup wizard..."
    chmod +x "$INSTALL_DIR/scripts/setup-wizard.sh"
    "$INSTALL_DIR/scripts/setup-wizard.sh"
}

# Deploy the stack
deploy_stack() {
    log_info "Deploying FIDScript stack..."

    local compose_dir="$INSTALL_DIR/docker"

    if [[ ! -f "$compose_dir/docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found at $compose_dir"
        exit 1
    fi

    cd "$compose_dir"

    log_info "Building and starting containers (this may take a few minutes)..."
    if ! docker compose up -d --build 2>&1; then
        log_error "docker compose up failed. Check logs with: docker compose -f $compose_dir/docker-compose.yml logs"
        exit 1
    fi

    log_info "Waiting for services to become healthy..."
    local max_wait=120
    local waited=0
    local all_healthy=false

    while [[ $waited -lt $max_wait ]]; do
        local unhealthy=$(docker compose -f "$compose_dir/docker-compose.yml" ps --format json 2>/dev/null | \
            python3 -c "import sys,json; [print(s['Service']) for s in (json.load(sys.stdin) if sys.stdin.read() else []) if s.get('Health') in ('unhealthy','')]" 2>/dev/null | wc -l)

        if [[ "$unhealthy" -eq "0" ]]; then
            all_healthy=true
            break
        fi
        sleep 5
        waited=$((waited + 5))
        echo -n "."
    done
    echo ""

    if [[ "$all_healthy" == "true" ]]; then
        log_info "All services are healthy."
    else
        log_warn "Some services may not be fully healthy yet. Check: docker compose -f $compose_dir/docker-compose.yml ps"
    fi

    # Run migrations
    log_info "Running database migrations..."
    if docker compose -f "$compose_dir/docker-compose.yml" exec -T api npx prisma migrate deploy 2>&1; then
        log_info "Migrations applied."
    else
        log_warn "Migration failed or already applied. Continuing..."
    fi

    # Seed admin user
    log_info "Seeding admin user..."
    if docker compose -f "$compose_dir/docker-compose.yml" exec -T api pnpm db:seed 2>&1; then
        log_info "Seed complete."
    else
        log_warn "Seed failed or admin already exists. Continuing..."
    fi

    # Reload Traefik to pick up the new dynamic.yml
    docker compose -f "$compose_dir/docker-compose.yml" kill -s HUP traefik 2>/dev/null || true
}

# Final verification
verify_installation() {
    log_info "Verifying installation..."

    local compose_dir="$INSTALL_DIR/docker"
    cd "$compose_dir"

    local running=$(docker compose -f "$compose_dir/docker-compose.yml" ps --services --filter "status=running" 2>/dev/null | wc -l)
    local total=$(docker compose -f "$compose_dir/docker-compose.yml" ps --services 2>/dev/null | wc -l)

    if [[ "$running" -ge "$total" ]]; then
        log_info "All $total containers running."
    else
        log_warn "$running/$total containers running. Check: docker compose -f $compose_dir/docker-compose.yml ps"
    fi

    echo ""
    log_info "Installation verification complete."
}

# Main installation flow
main() {
    detect_os
    check_prereqs
    create_dirs
    download_files
    run_setup
    deploy_stack
    verify_installation

    source "$INSTALL_DIR/.env" 2>/dev/null || true

    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║              FIDScript Deploy is running!                 ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Dashboard: https://${DOMAIN:-deploy.fidscript.com}"
    echo "  API:       https://${DOMAIN:-deploy.fidscript.com}/api"
    echo ""
    echo "  To check status:   $INSTALL_DIR/scripts/health-check.sh"
    echo "  To view logs:      docker compose -f $INSTALL_DIR/docker/docker-compose.yml logs -f"
    echo ""
}

main "$@"