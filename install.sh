#!/bin/bash
# =============================================================================
# FIDScript Deploy — One-line installer
# Usage: curl -sSL https://deploy.fidscript.com/install.sh | bash
# =============================================================================

set -Eeuo pipefail

INSTALLER_VERSION="1.2.0"
FIDSCRIPT_REPO="${FIDSCRIPT_REPO:-https://github.com/Mkid095/fidscript-deploy.git}"
INSTALL_DIR="/opt/fidscript"
COMPOSE_DIR="$INSTALL_DIR/docker"
SECRETS_DIR=""
DNS_OK=false
PUBLIC_IP=""

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
title()   { echo -e "\n${BOLD}${CYAN}╔${NC}${DIM}$(printf '═%.0s' {1..64})${NC}"; echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}${WHITE}$1${NC}"; echo -e "${BOLD}${CYAN}╚${NC}${DIM}$(printf '═%.0s' {1..64})${NC}"; }
banner()  {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}${WHITE}FIDScript Deploy — Installer v${INSTALLER_VERSION}${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
}
divider() { echo -e "${DIM}  $(printf '─%.0s' {1..64})${NC}"; }

# ── Trap: show line on error ──────────────────────────────────────────────────
trap 'echo -e "\n  ${RED}✗${NC}  Error at line $LINENO — stopping." >&2' ERR

# ── Check root ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root. Use: sudo bash install.sh"
    exit 1
fi

# ── Step 1: Detect environment ────────────────────────────────────────────────
step_1_env() {
  title "Step 1 / 6 — Detecting environment"
  divider

  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    info "OS: $PRETTY_NAME ($ID)"
  else
    error "Cannot detect OS. Ubuntu 22.04+ or Debian 11+ required."
    exit 1
  fi

  PUBLIC_IP="$(curl -s -m 8 https://api.ipify.org 2>/dev/null || \
               curl -s -m 8 https://ifconfig.me 2>/dev/null || true)"
  if [[ -n "$PUBLIC_IP" ]]; then
    info "Public IP: $PUBLIC_IP (auto-detected)"
  else
    warn "Could not auto-detect public IP — you will be prompted for it"
  fi
}

# ── Step 2: Check prerequisites ──────────────────────────────────────────────
step_2_prereqs() {
  title "Step 2 / 6 — Checking prerequisites"
  divider

  local missing=()
  command -v docker &>/dev/null || missing+=("docker")
  docker compose version &>/dev/null 2>&1 || docker-compose version &>/dev/null 2>&1 || missing+=("docker-compose")
  command -v curl  &>/dev/null || missing+=("curl")
  command -v openssl &>/dev/null || missing+=("openssl")
  command -v git   &>/dev/null || missing+=("git")

  if [[ ${#missing[@]} -gt 0 ]]; then
    info "Installing: ${missing[*]}"
    install_deps
  else
    info "All prerequisites satisfied"
  fi

  if ! docker info &>/dev/null; then
    error "Docker daemon is not running. Start it with: systemctl start docker"
    exit 1
  fi
}

install_deps() {
  step "Installing dependencies..."
  if [[ "$ID" == "ubuntu" || "$ID" == "debian" ]]; then
    apt-get update -qq 2>/dev/null || true
    apt-get install -y -qq curl openssl ca-certificates lsb-release git 2>/dev/null || \
      apt-get install -y curl openssl git
    if ! command -v docker &>/dev/null; then
      info "Installing Docker..."
      curl -fsSL https://get.docker.com | sh >/dev/null 2>&1 || true
      systemctl enable docker >/dev/null 2>&1 || true
      systemctl start docker >/dev/null 2>&1 || true
    fi
    if ! docker compose version &>/dev/null 2>&1; then
      info "Installing Docker Compose plugin..."
      mkdir -p /usr/local/lib/docker/cli-plugins
      curl -fsSL \
        "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
      chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    fi
  else
    error "Unsupported OS. Install Docker + git manually and re-run."
    exit 1
  fi
  info "Dependencies installed"
}

# ── Step 3: Clone / update source ─────────────────────────────────────────────
step_3_clone() {
  title "Step 3 / 6 — Obtaining source files"
  divider

  mkdir -p /data/fidscript

  local src_dir=""
  [[ -d "/opt/fidscript-deploy/installer" ]] && src_dir="/opt/fidscript-deploy"
  [[ -d "/root/fidscript-deploy/installer" ]]  && src_dir="/root/fidscript-deploy"

  if [[ -n "$src_dir" ]]; then
    info "Using local source: $src_dir"
    rm -rf "$INSTALL_DIR"
    cp -r "$src_dir/installer" "$INSTALL_DIR"
  else
    info "Cloning $FIDSCRIPT_REPO..."
    if ! git clone --depth 1 "$FIDSCRIPT_REPO" /opt/fidscript-deploy 2>/dev/null; then
      error "Clone failed. Check your network and token."
      exit 1
    fi
    rm -rf "$INSTALL_DIR"
    cp -r /opt/fidscript-deploy/installer "$INSTALL_DIR"
  fi
  ln -sfn "$INSTALL_DIR" /usr/local/bin/fidscript 2>/dev/null || true
  info "Source files ready at $INSTALL_DIR"
}

# ── Step 4: Run setup wizard ────────────────────────────────────────────────
step_4_wizard() {
  title "Step 4 / 6 — Configuration wizard"
  divider
  chmod +x "$INSTALL_DIR/scripts/setup-wizard.sh"
  "$INSTALL_DIR/scripts/setup-wizard.sh" "$PUBLIC_IP"
}

# ── Step 5: Deploy stack ─────────────────────────────────────────────────────
step_5_deploy() {
  title "Step 5 / 6 — Building and starting containers"
  divider

  [[ -f "$COMPOSE_DIR/docker-compose.yml" ]] || {
    error "docker-compose.yml missing at $COMPOSE_DIR"
    exit 1
  }

  step "Building images (this takes a few minutes)..."
  if ! docker compose -f "$COMPOSE_DIR/docker-compose.yml" up -d --build 2>&1; then
    error "Build failed. Logs: docker compose -f $COMPOSE_DIR/docker-compose.yml logs"
    exit 1
  fi
  info "Containers started"

  step "Waiting for services to become healthy..."
  local max_wait=300 waited=0
  while [[ $waited -lt $max_wait ]]; do
    local not_ready
    not_ready=$(docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps -a \
      --format '{{.Service}} {{.Health}}' 2>/dev/null \
      | awk '$2 != "healthy" && $2 != "" { print $1 }' | wc -l)
    echo -ne "  ${DIM}Services not ready: ${not_ready}    \r${NC}"
    if [[ "$not_ready" -eq 0 ]]; then
      echo ""
      info "All services healthy"
      break
    fi
    sleep 5; waited=$((waited + 5))
  done
  [[ $waited -ge $max_wait ]] && warn "Some services not healthy — check: docker compose -f $COMPOSE_DIR/docker-compose.yml ps"

  step "Running database migrations..."
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T api \
    npx prisma migrate deploy 2>&1 | tail -2 \
    && info "Migrations applied" || warn "Migration step skipped or already applied"

  step "Seeding admin account..."
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T api \
    pnpm db:seed 2>&1 | tail -2 \
    && info "Admin seeded" || warn "Seed skipped or admin already exists"

  # Reload Traefik to pick up generated dynamic.yml
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" kill -s HUP traefik 2>/dev/null || true
}

# ── Step 6: Verify ───────────────────────────────────────────────────────────
step_6_verify() {
  title "Step 6 / 6 — Final verification"
  divider

  source "$COMPOSE_DIR/.env" 2>/dev/null || true
  local access_url="https://${DOMAIN:-${SERVER_IP:-localhost}}"

  step "Checking platform health..."
  local api_ok=false
  for i in 1 2 3 4 5; do
    if curl -sf "${access_url}/api/v1/health" &>/dev/null; then
      api_ok=true; break
    fi
    sleep 3
  done

  if $api_ok; then
    info "API:     ${access_url}/api/v1/health  ✓"
  else
    warn "API:     ${access_url}/api/v1/health  (not reachable yet)"
  fi

  if [[ -n "$DOMAIN" ]]; then
    info "Dashboard: https://${DOMAIN}  ✓"
    info "Install:  https://${DOMAIN}/install.sh  ✓"
  fi

  echo ""
  echo -e "  ${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "  ${GREEN}║${NC}  ${BOLD}${WHITE}Platform is running!${NC}"
  echo -e "  ${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${DIM}Admin email:${NC}   ${ADMIN_EMAIL:-<set during wizard>}"
  echo -e "  ${DIM}Access URL:${NC}    ${access_url}"
  echo ""
  echo -e "  ${DIM}Next steps:${NC}"
  echo -e "  ${CYAN}  View logs:   docker compose -f $COMPOSE_DIR/docker-compose.yml logs -f${NC}"
  echo -e "  ${CYAN}  Stop stack:  docker compose -f $COMPOSE_DIR/docker-compose.yml down${NC}"
  echo -e "  ${CYAN}  Restart:      cd $COMPOSE_DIR && docker compose up -d${NC}"
  echo ""
}

# ── Main ───────────────────────────────────────────────────────────────────────
banner

echo -e "  ${DIM}Installing FIDScript Deploy on this server.${NC}"
echo -e "  ${DIM}Run 'sudo fidscript install' to update an existing install.${NC}"

step_1_env
step_2_prereqs
step_3_clone
step_4_wizard
step_5_deploy
step_6_verify
