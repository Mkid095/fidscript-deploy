#!/bin/bash
# =============================================================================
# FIDScript Deploy — One-line installer
# Usage: curl -sSL https://deploy.fidscript.com/install.sh | bash
# =============================================================================

set -Eeuo pipefail

INSTALLER_VERSION="1.3.0"
FIDSCRIPT_REPO="${FIDSCRIPT_REPO:-https://github.com/Mkid095/fidscript-deploy.git}"
REPO_DIR="/opt/fidscript-deploy"
INSTALL_DIR="/opt/fidscript"
# Compose runs from the repo checkout, not from a copy of installer/:
# the API and dashboard images are built from the monorepo root, so the
# build context has to resolve to the repo root.
COMPOSE_DIR="$REPO_DIR/installer/docker"
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

  local src_dir=""
  [[ -d "$REPO_DIR/installer" ]] && src_dir="$REPO_DIR"
  [[ -z "$src_dir" && -d "/root/fidscript-deploy/installer" ]] && src_dir="/root/fidscript-deploy"

  if [[ -n "$src_dir" ]]; then
    info "Using local source: $src_dir"
    REPO_DIR="$src_dir"
  else
    info "Cloning $FIDSCRIPT_REPO..."
    if ! git clone --depth 1 "$FIDSCRIPT_REPO" "$REPO_DIR" 2>/dev/null; then
      error "Clone failed. Check your network and token."
      exit 1
    fi
  fi

  # The repo checkout IS the install directory. /opt/fidscript points at
  # installer/ so the documented paths keep working, and the compose build
  # context resolves to the monorepo root.
  rm -rf "$INSTALL_DIR"
  ln -sfn "$REPO_DIR/installer" "$INSTALL_DIR"
  COMPOSE_DIR="$REPO_DIR/installer/docker"

  ln -sfn "$INSTALL_DIR/scripts/install.sh" /usr/local/bin/fidscript 2>/dev/null || true
  info "Source files ready at $INSTALL_DIR (→ $REPO_DIR/installer)"
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
  # Run from the real repo path so the build context (`../..`) resolves to
  # the monorepo root, where apps/api/Dockerfile and apps/dashboard/Dockerfile live.
  if ! (cd "$COMPOSE_DIR" && docker compose up -d --build 2>&1); then
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

# ── Step 5c: Send the operator their credentials ────────────────────────────
# The wizard prints the credentials once, at the end of the screen. An email
# means they do not have to photograph the terminal, and it means the
# operator has a way in even if the session ends.
#
# The password is the install-time one, and the platform forces a change on
# the first sign-in — so this is a way in, not a permanent secret.
step_5c_welcome_email() {
  source "$COMPOSE_DIR/.env" 2>/dev/null || true
  [[ -n "$ADMIN_EMAIL" && -n "$ADMIN_PASSWORD" && -n "$DOMAIN" ]] || {
    warn "No admin credentials to email — skipping."
    return 0
  }

  local msg_file
  msg_file="$(mktemp)"
  {
    printf 'From: FIDScript Deploy <admin@%s>\n' "$DOMAIN"
    printf 'To: %s\n' "$ADMIN_EMAIL"
    printf 'Subject: Your FIDScript platform is ready\n'
    printf 'MIME-Version: 1.0\n'
    printf 'Content-Type: text/plain; charset=utf-8\n'
    printf '\n'
    printf 'Your platform is installed and running.\n\n'
    printf '  Sign in:  https://%s\n' "$DOMAIN"
    printf '  Email:    %s\n' "$ADMIN_EMAIL"
    printf '  Password: %s\n\n' "$ADMIN_PASSWORD"
    printf 'That password is temporary — you will be asked to change it when\n'
    printf 'you sign in.\n\n'
    printf 'The first thing you will see is the Applications screen. The\n'
    printf 'deployment engine and the mail server are already there; the rest\n'
    printf 'you install from it, one at a time.\n\n'
    printf 'If you did not do this install, ignore this message and change the\n'
    printf 'password.\n'
  } > "$msg_file"

  # The mail server publishes submission on 465, so this does not depend on
  # DNS or on a certificate having been issued.
  if curl -sS --ssl-reqd --max-time 30 \
      --url "smtp://127.0.0.1:465" \
      --mail-from "admin@${DOMAIN}" \
      --mail-rcpt "$ADMIN_EMAIL" \
      --user "admin:${SMTP_SUBMISSION_PASS:-}" \
      --upload-file "$msg_file" >/dev/null 2>&1; then
    info "Welcome email sent to $ADMIN_EMAIL"
  else
    warn "Could not send the welcome email — the credentials are below."
  fi
  rm -f "$msg_file"
}

# ── Step 5b: Connect the Instant BaaS ───────────────────────────────────────
# The Instant console only exists once the stack is up, so the personal
# access token — the credential that lets the platform create an app for a
# project — is collected AFTER the deploy rather than during the wizard.
#
# The token is optional: without it the platform runs with Instant
# unavailable, and the operator can add it later.
step_5b_instant() {
  source "$COMPOSE_DIR/.env" 2>/dev/null || true
  local secrets_dir="$COMPOSE_DIR/secrets"
  local addons
  addons="$(grep -m1 '^FIDScript_ADDONS=' "$COMPOSE_DIR/.env" 2>/dev/null \
    | cut -d= -f2- | tr -d '"' | tr ',' ' ')"
  case " ${addons} " in
    *" instant "*) ;;
    *) return 0 ;;
  esac

  local secret_file="$secrets_dir/instant_superuser_token.txt"
  if [[ -s "$secret_file" ]]; then
    info "Instant: superuser token already set"
    return 0
  fi

  title "Step 5b / 6 — Connecting the Instant BaaS"
  divider
  echo -e "  ${DIM}The Instant BaaS is the data plane: your projects' tables,${NC}"
  echo -e "  ${DIM}users, permissions and files live there. The platform needs${NC}"
  echo -e "  ${DIM}one credential to create an app for a project.${NC}"
  echo ""
  echo -e "  ${WHITE}1.${NC} Open  ${CYAN}https://instant.${DOMAIN:-<domain>}${NC}"
  echo -e "  ${WHITE}2.${NC} Sign in as  ${CYAN}${INSTANT_SUPERUSER_EMAIL:-${ADMIN_EMAIL}}${NC}"
  echo -e "  ${WHITE}3.${NC} Open  ${CYAN}Settings → API keys${NC}, create a token named"
  echo -e "     ${CYAN}FIDScript platform${NC} and copy it (it starts with ${CYAN}per_${NC})"
  echo ""
  prompt "Personal access token (Enter to skip): "
  local token
  read -r token || true
  token="$(echo "$token" | tr -d '[:space:]')"

  if [[ -z "$token" ]]; then
    warn "Skipped — the platform will report Instant as unavailable."
    warn "Add it later with: echo 'per_...' | sudo tee $secret_file"
    return 0
  fi

  # Verify it against the running Instant server before storing it. The
  # server publishes 8888 on the host, so this does not depend on DNS or
  # on a certificate having been issued yet.
  local port="${INSTANT_SERVER_PORT:-8888}"
  if curl -sf -H "Authorization: Bearer ${token}" \
      "http://127.0.0.1:${port}/dash/personal_access_tokens" >/dev/null 2>&1; then
    printf '%s' "$token" > "$secret_file"
    chmod 600 "$secret_file"
    info "Instant: superuser token accepted"
  else
    warn "That token was not accepted by the Instant server."
    warn "The platform will report Instant as unavailable. Add it later with:"
    warn "  echo 'per_...' | sudo tee $secret_file"
  fi
}

# ── Step 6: Verify ───────────────────────────────────────────────────────────
step_6_verify() {
  title "Step 6 / 6 — Final verification"
  divider

  source "$COMPOSE_DIR/.env" 2>/dev/null || true
  local access_url="https://${DOMAIN:-${SERVER_IP:-localhost}}"

  step "Checking platform health..."
  local api_ok=false
  for _ in 1 2 3 4 5; do
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
step_5b_instant
step_5c_welcome_email
step_6_verify
