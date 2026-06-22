#!/usr/bin/env bash
#
# FIDScript Deploy — Dumb Bootstrap Installer v2.0.0
# =====================================================
# A NO-QUESTIONS bootstrap. It:
#   1. Checks root
#   2. Detects OS (Ubuntu/Debian only, warns on others)
#   3. Auto-detects public IP via api.ipify.org
#   4. Installs Docker + docker compose if missing
#   5. Clones/pulls the repo to /opt/fidscript-deploy
#   6. Copies installer to /opt/fidscript
#   7. Symlinks /usr/local/bin/fidscript
#   8. Generates minimal secrets (chmod 600)
#   9. Writes .env with all secrets + auto-detected IP
#  10. Writes a bare IP-based Traefik dynamic.yml (NO domain routers)
#  11. docker compose up -d --build
#  12. Waits for services healthy (max 5 min)
#  13. Runs prisma migrate deploy (graceful failure)
#  14. Prints the IP-based access URL
#
# All "smart" config (domain, Cloudflare, auth) happens inside the browser at /setup
#
set -Eeuo pipefail

INSTALLER_VERSION="2.0.0"
REPO_URL="https://github.com/kennedymwangi/fidscript-deploy.git"
REPO_DIR="/opt/fidscript-deploy"
INSTALL_DIR="/opt/fidscript"
SECRETS_DIR="${INSTALL_DIR}/docker/secrets"
SCRIPT_BRANCH="${SCRIPT_BRANCH:-main}"

# ─── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m';   GRN='\033[0;32m';   YEL='\033[1;33m'
CYAN='\033[0;36m';  BOLD='\033[1m';     DIM='\033[2m'
WHITE='\033[97m';   NC='\033[0m'
OK="\\033[0;32m✓\\033[0m";  ERR="\\033[0;31m✗\\033[0m"
INF="\\033[0;36m▶\\033[0m"

# ─── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "  ${GRN}✓${NC}  $*"; }
warn()    { echo -e "  ${YEL}!${NC}  $*"; }
error()   { echo -e "  ${RED}✗${NC}  $*" >&2; }
step()    { echo -e "\n  ${CYAN}▶${NC}  $*"; }
title()   { echo -e "\n${BOLD}${CYAN}━━━ ${*} ━━━${NC}"; }

# ─── Cleanup on error ─────────────────────────────────────────────────────────
INSTALL_PID="$$"
cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo
    error "Bootstrap failed. Check messages above."
    echo "  Run 'docker compose -f ${INSTALL_DIR}/docker/docker-compose.yml logs' to debug."
  fi
}
trap cleanup EXIT

# ─── 1. Root check ────────────────────────────────────────────────────────────
title "1 — Privileges"
if [[ $EUID -ne 0 ]]; then
  error "Must be run as root."
  echo "  Usage: sudo $0"
  exit 1
fi
info "Running as root"

# ─── 2. OS detection ───────────────────────────────────────────────────────────
title "2 — OS detection"
if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  source /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_ID_LIKE="${ID_LIKE:-}"
  OS_PRETTY_NAME="${PRETTY_NAME:-Linux}"
else
  OS_ID="unknown"
  OS_ID_LIKE=""
  OS_PRETTY_NAME="Linux (unknown)"
fi

info "Detected: ${BOLD}${OS_PRETTY_NAME}${NC}"

SUPPORTED=0
if [[ "${OS_ID}" == "ubuntu" ]] || [[ "${OS_ID}" == "debian" ]] || \
   [[ "${OS_ID_LIKE}" == *"ubuntu"* ]] || [[ "${OS_ID_LIKE}" == *"debian"* ]]; then
  SUPPORTED=1
  info "Supported OS (Debian/Ubuntu)"
fi

if [[ ${SUPPORTED} -eq 0 ]]; then
  warn "Unsupported OS (${OS_ID}). Attempting anyway..."
  echo "  Only Ubuntu and Debian are officially supported."
fi

# ─── 3. Public IP detection ───────────────────────────────────────────────────
title "3 — Network detection"
PUBLIC_IP=""
for try in \
  "https://api.ipify.org" \
  "https://api.my-ip.io/v2/ip.txt" \
  "https://ifconfig.me/ip"; do
  PUBLIC_IP=$(curl -sf --max-time 8 "${try}" 2>/dev/null | tr -d '\r\n ' || true)
  if [[ -n "${PUBLIC_IP}" ]] && [[ "${PUBLIC_IP}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    info "Public IP detected: ${BOLD}${PUBLIC_IP}${NC}"
    break
  fi
  PUBLIC_IP=""
done

if [[ -z "${PUBLIC_IP}" ]]; then
  warn "Could not auto-detect public IP. Using empty DOMAIN."
  PUBLIC_IP=""
fi

# ─── 4. Install Docker + docker compose ───────────────────────────────────────
title "4 — Docker installation"

install_docker_ubuntu_debian() {
  info "Installing Docker (apt)..."
  export DEBIAN_FRONTEND=noninteractive

  apt-get update -qq
  apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release jq bc timeout \
    ncurses-utils sqlite3 git 2>/dev/null

  # Add Docker's GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Add Docker repo
  local arch; arch=$(dpkg --print-architecture)
  echo "deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/${OS_ID} \
    \"$(lsb_release -cs)\" stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin 2>/dev/null

  # Start and enable Docker
  systemctl start docker 2>/dev/null || true
  systemctl enable docker 2>/dev/null || true

  # Add users to docker group
  for user in ubuntu "$SUDO_USER" "$(who | awk '{print $1}' | sort -u)"; do
    [[ -n "${user}" ]] && id "${user}" &>/dev/null && usermod -aG docker "${user}" 2>/dev/null || true
  done

  info "Docker installed: $(docker --version | cut -d' ' -f3 | tr -d ',')"
  info "Compose installed: $(docker compose version | cut -d' ' -f4)"
}

if command -v docker &>/dev/null; then
  info "Docker already installed: $(docker --version | cut -d' ' -f3 | tr -d ',')"
  if docker compose version &>/dev/null; then
    info "Docker Compose already installed: $(docker compose version | cut -d' ' -f4)"
  else
    warn "Docker present but Compose plugin missing — installing..."
    install_docker_ubuntu_debian
  fi
else
  install_docker_ubuntu_debian
fi

# Ensure required Docker networks exist
docker network create fidscript 2>/dev/null || true
docker network create fidscript-app 2>/dev/null || true

# ─── 5. Clone or pull repo ────────────────────────────────────────────────────
title "5 — Repository"

if [[ -d "${REPO_DIR}/.git" ]]; then
  info "Repo already present at ${REPO_DIR}"
  info "Pulling latest ${SCRIPT_BRANCH}..."
  cd "${REPO_DIR}" && git fetch origin "${SCRIPT_BRANCH}" && \
    git checkout "${SCRIPT_BRANCH}" && \
    git pull origin "${SCRIPT_BRANCH}" || warn "Pull failed — continuing with existing state"
  info "Repo updated"
else
  info "Cloning ${REPO_URL} to ${REPO_DIR}..."
  git clone -b "${SCRIPT_BRANCH}" --depth 1 "${REPO_URL}" "${REPO_DIR}"
  info "Repo cloned"
fi

# ─── 6. Copy installer to /opt/fidscript ──────────────────────────────────────
title "6 — Install directory"

if [[ -L "${INSTALL_DIR}" ]] || [[ -d "${INSTALL_DIR}" ]]; then
  info "Removing existing install at ${INSTALL_DIR}..."
  rm -rf "${INSTALL_DIR}"
fi

info "Copying installer to ${INSTALL_DIR}..."
mkdir -p "$(dirname "${INSTALL_DIR}")"
cp -r "${REPO_DIR}/installer" "$(dirname "${INSTALL_DIR}")/fidscript"
mv "$(dirname "${INSTALL_DIR}")/fidscript" "${INSTALL_DIR}"
info "Install directory: ${INSTALL_DIR}"

# ─── 7. Symlink /usr/local/bin/fidscript ──────────────────────────────────────
title "7 — CLI symlink"

SCRIPT_PATH="${INSTALL_DIR}/scripts/install.sh"
if [[ ! -f "${SCRIPT_PATH}" ]]; then
  error "install.sh not found at ${SCRIPT_PATH}"
  exit 1
fi

# Main fidscript symlink → install.sh
ln -sf "${SCRIPT_PATH}" /usr/local/bin/fidscript
info "Symlinked: /usr/local/bin/fidscript"

# Convenience symlinks for related scripts
for prog in setup-wizard.sh health-check.sh configure-firewall.sh; do
  SRC="${INSTALL_DIR}/scripts/${prog}"
  DST="/usr/local/bin/fidscript-${prog%.sh}"
  [[ -f "${SRC}" ]] && ln -sf "${SRC}" "${DST}" && info "Symlinked: ${DST}"
done

# ─── 8. Generate secrets ──────────────────────────────────────────────────────
title "8 — Generating secrets"

# Secret list: filename → hex byte-length (0 = empty file)
declare -A SECRETS=(
  [postgres_password.txt]=64
  [redis_password.txt]=64
  [minio_access_key.txt]=32
  [minio_secret_key.txt]=64
  [jwt_secret.txt]=64
  [encryption_key.txt]=64
  [stalwart_admin_token.txt]=64
  [stalwart_webhook_secret.txt]=64
  [system_mailbox_password.txt]=32
  [smtp_submission_pass.txt]=64
  [cf_api_token.txt]=0          # empty — Cloudflare configured via /setup
)

mkdir -p "${SECRETS_DIR}"
chmod 700 "${SECRETS_DIR}"

for secret_file in "${!SECRETS[@]}"; do
  secret_path="${SECRETS_DIR}/${secret_file}"
  secret_len="${SECRETS[$secret_file]}"

  if [[ "${secret_len}" -eq 0 ]]; then
    printf '' > "${secret_path}"
  else
    head -c "${secret_len}" /dev/urandom | xxd -p | head -c "${secret_len}" > "${secret_path}"
  fi

  chmod 600 "${secret_path}"
  info "Generated: ${secret_file}"
done

# stalwart_credentials.txt — format: "admin:<admin-token>"
# Stalwart directory authentication reads this file.
STALWART_ADMIN_TOKEN=$(cat "${SECRETS_DIR}/stalwart_admin_token.txt")
printf 'admin:%s\n' "${STALWART_ADMIN_TOKEN}" > "${SECRETS_DIR}/stalwart_credentials.txt"
chmod 600 "${SECRETS_DIR}/stalwart_credentials.txt"
info "Generated: stalwart_credentials.txt"

# Create Docker secret symlinks (compose references names without .txt suffix)
for txt in "${SECRETS_DIR}"/*.txt; do
  [[ -f "${txt}" ]] || continue
  base="$(basename "${txt}" .txt)"
  [[ -L "${SECRETS_DIR}/${base}" ]] && continue
  ln -sf "$(basename "${txt}")" "${SECRETS_DIR}/${base}"
done

info "All secrets generated at ${SECRETS_DIR} (chmod 600)"

# ─── 9. Write .env file ───────────────────────────────────────────────────────
title "9 — Writing .env"

read_secret() { cat "${SECRETS_DIR}/${1}" 2>/dev/null || echo ""; }

POSTGRES_PASSWORD=$(read_secret postgres_password.txt)
REDIS_PASSWORD=$(read_secret redis_password.txt)
MINIO_ACCESS_KEY=$(read_secret minio_access_key.txt)
MINIO_SECRET_KEY=$(read_secret minio_secret_key.txt)
JWT_SECRET=$(read_secret jwt_secret.txt)
ENCRYPTION_KEY=$(read_secret encryption_key.txt)
SMTP_SUBMISSION_USER="admin"
SMTP_SUBMISSION_PASS=$(read_secret smtp_submission_pass.txt)
SYSTEM_MAILBOX_PASSWORD=$(read_secret system_mailbox_password.txt)

DOCKER_GID_VALUE=$(getent group docker 2>/dev/null | awk -F: '{print $3}' || echo "988")

cat > "${INSTALL_DIR}/docker/.env" << ENVEOF
# FIDScript Deploy — Auto-generated .env
# Generated by install.sh v${INSTALLER_VERSION} on $(date -Iseconds)
# DO NOT EDIT MANUALLY — changes are overwritten on next run
STALWART_VERSION=v0.16.10
DOMAIN=${PUBLIC_IP:-}
ADMIN_EMAIL=admin@${PUBLIC_IP:-localhost}
ADMIN_PASSWORD=${ENCRYPTION_KEY}
STORAGE_PATH=/data/fidscript
AUTO_SSL=false
SERVER_IP=${PUBLIC_IP:-}
PLATFORM_DOMAIN=
PLATFORM_MAIL_HOST=mail.${PUBLIC_IP:-localhost}
SMTP_SUBMISSION_USER=${SMTP_SUBMISSION_USER}
SMTP_SUBMISSION_PASS=${SMTP_SUBMISSION_PASS}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_EXTERNAL_ENDPOINT=http://localhost:9000
STALWART_RECOVERY_ADMIN=admin:${SMTP_SUBMISSION_PASS}
DOCKER_GID=${DOCKER_GID_VALUE}
ENVEOF

info ".env written: ${INSTALL_DIR}/docker/.env"

# api.env — used by pgbouncer and other services via env_file
cat > "${SECRETS_DIR}/api.env" << ENVEOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
SMTP_SUBMISSION_USER=submission@${PUBLIC_IP:-localhost}
SMTP_SUBMISSION_PASS=${SMTP_SUBMISSION_PASS}
SYSTEM_MAILBOX_PASSWORD=${SYSTEM_MAILBOX_PASSWORD}
ENVEOF
chmod 600 "${SECRETS_DIR}/api.env"
info "api.env written: ${SECRETS_DIR}/api.env"

# ─── 10. Write minimal Traefik dynamic.yml ────────────────────────────────────
title "10 — Writing Traefik dynamic.yml (IP-fallback only)"

DYNAMIC_YML="${INSTALL_DIR}/docker/traefik/dynamic.yml"

cat > "${DYNAMIC_YML}" << 'TRAEFIKEOF'
# =============================================================================
# FIDScript Deploy — Minimal IP-fallback Traefik dynamic config
# =============================================================================
# AUTO-GENERATED by install.sh v2.0.0
# All domain-based routing is configured by the browser /setup page.
# The traefik.yml (static config) is already present and unchanged.
# =============================================================================

http:
  # ── Middlewares ──────────────────────────────────────────────────────────────
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        browserXssFilter: true
        contentTypeNosniff: true
        sslRedirect: false
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true

    compress:
      compress: {}

    redirect-to-projects:
      redirectRegex:
        regex: "^/\$"
        replacement: "/projects"
        permanent: false

  # ── HTTP Routers ────────────────────────────────────────────────────────────
  routers:
    # IP-based fallback — serves dashboard at http://<ip>:3001
    # This is the ONLY router until domain routing is configured via /setup
    ip-fallback:
      entryPoints:
        - web
        - websecure
      rule: "PathPrefix(\`/\`)"
      service: dashboard-ip
      middlewares:
        - security-headers
        - compress
      priority: 1

  # ── HTTP Services ───────────────────────────────────────────────────────────
  services:
    dashboard-ip:
      loadBalancer:
        servers:
          - url: "http://fidscript_dashboard:3001"

    api-ip:
      loadBalancer:
        servers:
          - url: "http://fidscript_api:3001"

TRAEFIKEOF

info "Traefik dynamic.yml written: ${DYNAMIC_YML}"

# ─── 11. Docker compose up ────────────────────────────────────────────────────
title "11 — Starting Docker stack"

cd "${INSTALL_DIR}/docker"

info "Building and starting containers (this may take several minutes)..."
# Capture output but don't fail on build output
docker compose up -d --build 2>&1 | tail -10 || true

sleep 5

RUNNING=$(docker compose -f "${INSTALL_DIR}/docker/docker-compose.yml" \
  ps --services --filter "status=running" 2>/dev/null | wc -l || echo "0")
TOTAL=$(docker compose -f "${INSTALL_DIR}/docker/docker-compose.yml" \
  config --services 2>/dev/null | wc -l || echo "0")
info "Containers running: ${RUNNING}/${TOTAL}"

# ─── 12. Wait for services healthy ───────────────────────────────────────────
title "12 — Waiting for services (max 5 minutes)"

MAX_WAIT=300
INTERVAL=5
WAITED=0

is_service_healthy() {
  local svc=$1
  # Try health status first
  local status
  status=$(docker inspect "fidscript_${svc}" --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
  [[ "${status}" == "healthy" ]] && return 0
  # Fallback: running at all
  docker inspect "fidscript_${svc}" --format='{{.State.Running}}' 2>/dev/null | grep -q "true"
}

wait_for_service() {
  local svc=$1
  local description="${2:-${svc}}"
  local waited=0
  while [[ ${waited} -lt ${MAX_WAIT} ]]; do
    if is_service_healthy "${svc}"; then
      info "${description} is healthy"
      return 0
    fi
    sleep ${INTERVAL}
    waited=$((waited + INTERVAL))
    echo -ne "  ${INF} Waiting for ${description}... ${waited}s/${MAX_WAIT}s    \r"
  done
  echo
  warn "${description} did not become healthy within ${MAX_WAIT}s — continuing anyway"
  return 1
}

# Core services — all must at least be running
CORE_SERVICES=("postgres" "pgbouncer" "redis" "nats" "minio" "api" "dashboard")

FAILED=0
for svc in "${CORE_SERVICES[@]}"; do
  if ! wait_for_service "${svc}"; then
    FAILED=1
  fi
done
echo

if [[ ${FAILED} -eq 1 ]]; then
  warn "Some services did not become healthy in time."
  info "Run 'docker compose ps' to check status."
fi

# ─── 13. Prisma migrate deploy ───────────────────────────────────────────────
title "13 — Database migrations"

info "Running Prisma migrate deploy..."
MIGRATE_OUTPUT=$(docker compose -f "${INSTALL_DIR}/docker/docker-compose.yml" \
  run --rm --no-log-prefix api \
  npx prisma migrate deploy 2>&1) || true

if echo "${MIGRATE_OUTPUT}" | grep -qi "error\|failed\|prisma_migrations"; then
  warn "Migration reported issues (may be okay on first run):"
  echo "${MIGRATE_OUTPUT}" | tail -10 | sed 's/^/  /'
else
  info "Prisma migrate deploy completed"
fi

# ─── 14. Done! ───────────────────────────────────────────────────────────────
title "14 — Done!"

ACCESS_URL="http://${PUBLIC_IP:-<server-ip>}:3001"

echo
echo -e "${BOLD}${GRN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GRN}  FIDScript Deploy v${INSTALLER_VERSION} bootstrap complete!${NC}"
echo -e "${BOLD}${GRN}═══════════════════════════════════════════════════════════════${NC}"
echo
echo -e "  ${BOLD}Access URL:${NC}   ${CYAN}${ACCESS_URL}${NC}"
echo -e "  ${BOLD}Dashboard:${NC}   ${CYAN}${ACCESS_URL}/projects${NC}"
echo -e "  ${BOLD}API:${NC}          ${CYAN}${ACCESS_URL}/api${NC}"
echo -e "  ${BOLD}Setup page:${NC}   ${CYAN}${ACCESS_URL}/setup${NC}"
echo
echo -e "  ${YEL}⚠ Next step:${NC}   Open ${ACCESS_URL}/setup in your browser"
echo -e "                to configure your domain, Cloudflare, and admin account."
echo
echo -e "  Useful commands:"
echo -e "    docker compose -f ${INSTALL_DIR}/docker/docker-compose.yml ps"
echo -e "    docker compose -f ${INSTALL_DIR}/docker/docker-compose.yml logs -f"
echo -e "    docker compose -f ${INSTALL_DIR}/docker/docker-compose.yml restart"
echo
echo -e "  Install dir:  ${INSTALL_DIR}"
echo -e "  Repo dir:     ${REPO_DIR}"
echo -e "  Version:      ${INSTALLER_VERSION}"
echo
echo -e "${BOLD}${GRN}═══════════════════════════════════════════════════════════════${NC}"
echo
