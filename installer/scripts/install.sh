#!/bin/bash
set -e

INSTALLER_VERSION="1.1.0"
# Where to clone from when no local checkout exists (fresh-VPS one-liner path).
# Overridable: FIDSCRIPT_REPO=git@... bash install.sh
FIDSCRIPT_REPO="${FIDSCRIPT_REPO:-https://github.com/Mkid095/fidscript-deploy.git}"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FIDScript Deploy Installer v${INSTALLER_VERSION}                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }

INSTALL_DIR="/opt/fidscript"
COMPOSE_DIR="$INSTALL_DIR/docker"
DNS_OK=false
PUBLIC_IP=""

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
            [[ "$OS_VERSION" != "22.04" && "$OS_VERSION" != "24.04" ]] \
                && log_warn "Tested on Ubuntu 22.04/24.04. You have: $OS_VERSION" ;;
        debian)
            [[ "$OS_VERSION" != "11" && "$OS_VERSION" != "12" ]] \
                && log_warn "Tested on Debian 11/12. You have: $OS_VERSION" ;;
        *)
            log_warn "Untested OS: $OS. Designed for Ubuntu/Debian — continuing anyway." ;;
    esac
}

# Detect this server's public IP (used for the IP-fallback access URL when DNS
# isn't live yet, and as a default the wizard can offer).
detect_public_ip() {
    PUBLIC_IP="$(curl -s -m 8 https://api.ipify.org 2>/dev/null || true)"
    if [[ -z "$PUBLIC_IP" ]]; then
        PUBLIC_IP="$(curl -s -m 8 https://ifconfig.me 2>/dev/null || true)"
    fi
    if [[ -n "$PUBLIC_IP" ]]; then
        log_info "Detected public IP: $PUBLIC_IP"
    else
        log_warn "Could not auto-detect public IP. You'll enter it in the wizard."
    fi
}

# Check prerequisites (installs Docker if missing)
check_prereqs() {
    log_step "Checking prerequisites..."
    local missing=()
    command -v docker &> /dev/null || missing+=("docker")
    docker compose version &> /dev/null 2>&1 || docker-compose version &> /dev/null 2>&1 || missing+=("docker-compose")
    command -v curl &> /dev/null || missing+=("curl")
    command -v openssl &> /dev/null || missing+=("openssl")
    command -v git &> /dev/null || missing+=("git")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_info "Installing missing dependencies: ${missing[*]}"
        install_deps
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Start it with 'systemctl start docker' and re-run."
        exit 1
    fi
    log_info "All prerequisites met."
}

install_deps() {
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get update -qq
        apt-get install -y -qq curl openssl ca-certificates lsb-release git >/dev/null 2>&1
        if ! command -v docker &> /dev/null; then
            log_info "Installing Docker..."
            curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1 || true
            systemctl start docker >/dev/null 2>&1 || true
            # On most distros the docker group exists; add the current user if non-root-login.
            groupadd -f docker >/dev/null 2>&1 || true
        fi
        # docker compose v2 ships with the docker CLI plugin; ensure it's present.
        if ! docker compose version &> /dev/null 2>&1; then
            log_info "Installing Docker Compose plugin..."
            mkdir -p /usr/local/lib/docker/cli-plugins
            curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
                -o /usr/local/lib/docker/cli-plugins/docker-compose
            chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
        fi
    else
        log_error "Automatic dependency install only supports Ubuntu/Debian. Install Docker + git manually and re-run."
        exit 1
    fi
}

# Create installation + data directories
create_dirs() {
    log_step "Creating directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p /data/fidscript/postgres /data/fidscript/redis /data/fidscript/nats /data/fidscript/minio /data/fidscript/stalwart
}

# Obtain the FIDScript source. Prefer an existing local checkout (dev/test);
# otherwise clone from the canonical repo so a fresh VPS needs only this script.
download_files() {
    log_step "Obtaining FIDScript Deploy files..."
    local src_dir=""
    if [[ -d "/opt/fidscript-deploy/installer" ]]; then src_dir="/opt/fidscript-deploy"
    elif [[ -d "/root/fidscript-deploy/installer" ]]; then src_dir="/root/fidscript-deploy"; fi

    if [[ -n "$src_dir" ]]; then
        log_info "Using local source at $src_dir..."
        rm -rf "$INSTALL_DIR"
        cp -r "$src_dir/installer" "$INSTALL_DIR"
    else
        log_info "No local checkout found — cloning $FIDSCRIPT_REPO..."
        if ! git clone --depth 1 "$FIDSCRIPT_REPO" /opt/fidscript-deploy 2>/dev/null; then
            log_error "Could not clone $FIDSCRIPT_REPO. Clone manually or set FIDSCRIPT_REPO."
            exit 1
        fi
        rm -rf "$INSTALL_DIR"
        cp -r /opt/fidscript-deploy/installer "$INSTALL_DIR"
    fi
    ln -sfn "$INSTALL_DIR" /usr/local/bin/fidscript 2>/dev/null || true
}

# Run the interactive config wizard (collects domain, admin, mail, Cloudflare…)
run_setup() {
    log_step "Starting configuration wizard..."
    chmod +x "$INSTALL_DIR/scripts/setup-wizard.sh"
    "$INSTALL_DIR/scripts/setup-wizard.sh" "$PUBLIC_IP"
}

# Build + start the stack, then run migrations + seed
deploy_stack() {
    log_step "Building and starting containers (this takes a few minutes)..."
    [[ -f "$COMPOSE_DIR/docker-compose.yml" ]] || { log_error "docker-compose.yml missing at $COMPOSE_DIR"; exit 1; }
    cd "$COMPOSE_DIR"

    if ! docker compose up -d --build 2>&1; then
        log_error "docker compose up failed. Logs: docker compose -f $COMPOSE_DIR/docker-compose.yml logs"
        exit 1
    fi

    log_step "Waiting for services to become healthy..."
    local max_wait=180 waited=0
    while [[ $waited -lt $max_wait ]]; do
        # Count services that HAVE a healthcheck but aren't healthy yet.
        # Traefik has no healthcheck (blank Health) so it's excluded automatically.
        local not_ready
        not_ready=$(docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps -a --format '{{.Service}} {{.Health}}' 2>/dev/null \
            | awk '$2 != "healthy" && $2 != "" { print $1 }' | wc -l)
        if [[ "$not_ready" -eq 0 ]]; then
            log_info "All services are healthy."
            break
        fi
        sleep 5; waited=$((waited + 5)); echo -n "."
    done
    echo ""
    [[ $waited -ge $max_wait ]] && log_warn "Some services not healthy yet. Check: docker compose -f $COMPOSE_DIR/docker-compose.yml ps"

    log_step "Running database migrations..."
    docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T api npx prisma migrate deploy 2>&1 \
        && log_info "Migrations applied." || log_warn "Migration step failed or already applied. Continuing."

    log_step "Seeding admin account..."
    docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T api pnpm db:seed 2>&1 \
        && log_info "Seed complete." || log_warn "Seed failed or admin already exists. Continuing."

    # Reload Traefik to pick up the generated dynamic.yml
    docker compose -f "$COMPOSE_DIR/docker-compose.yml" kill -s HUP traefik 2>/dev/null || true
}

# Verify the domain actually resolves to this server (propagation check).
# Sets DNS_OK=true so the final banner can pick domain vs IP-fallback URL.
verify_dns() {
    log_step "Verifying domain DNS..."
    # shellcheck disable=SC1090
    source "$COMPOSE_DIR/.env" 2>/dev/null || true
    [[ -z "$DOMAIN" ]] && { log_warn "No DOMAIN in .env — skipping DNS check."; return; }
    local sub="deploy.${DOMAIN}"
    local resolved
    resolved=$(getent hosts "$sub" 2>/dev/null | awk '{print $1}' | head -1)
    if [[ -z "$resolved" ]]; then
        # Fallback to Cloudflare DoH in case the local resolver hasn't caught up
        resolved=$(curl -s -m 6 "https://1.1.1.1/dns-query?name=${sub}&type=A" -H "accept: application/dns-json" 2>/dev/null \
            | grep -o '"data":"[0-9.]*"' | head -1 | cut -d'"' -f4)
    fi
    if [[ "$resolved" == "$SERVER_IP" ]]; then
        DNS_OK=true
        log_info "DNS verified: ${sub} → ${SERVER_IP}"
    else
        DNS_OK=false
        log_warn "DNS for ${sub} resolved to '${resolved:-nothing}' (expected ${SERVER_IP})."
        log_warn "Propagation may still be in progress — the IP fallback URL below works immediately."
    fi
}

# Friendly summary: access URL (domain if DNS ok, else IP), admin creds, next steps.
print_success() {
    # shellcheck disable=SC1090
    source "$COMPOSE_DIR/.env" 2>/dev/null || true
    local url
    if [[ "$DNS_OK" == "true" ]]; then
        url="https://${DOMAIN}"
    else
        url="http://${SERVER_IP:-$PUBLIC_IP}"
    fi

    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          FIDScript Deploy is running! ✦                   ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "  ${CYAN}Access URL${NC} : ${BOLD}${url}${NC}"
    echo -e "  ${CYAN}Admin email${NC}: ${ADMIN_EMAIL:-<set during wizard>}"
    echo -e "  ${CYAN}Password${NC}   : ${CYAN}${ADMIN_PASSWORD:-<set during wizard>}${NC}"
    if [[ "$DNS_OK" != "true" && -n "$DOMAIN" ]]; then
        echo ""
        echo -e "  ${YELLOW}DNS not live yet${NC} — once '${DOMAIN}' resolves to this server,"
        echo "  your permanent URL will be https://${DOMAIN}"
    fi
    echo ""
    echo "  First login will prompt you to change this password."
    echo ""
    echo "  Status:   $INSTALL_DIR/scripts/health-check.sh"
    echo "  Logs:     docker compose -f $COMPOSE_DIR/docker-compose.yml logs -f"
    echo "  Update:   cd $COMPOSE_DIR && git -C /opt/fidscript-deploy pull && docker compose up -d --build"
    echo ""
}

main() {
    detect_os
    detect_public_ip
    check_prereqs
    create_dirs
    download_files
    run_setup
    deploy_stack
    verify_dns
    print_success
}

main "$@"
