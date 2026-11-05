#!/bin/bash
# =============================================================================
# FIDScript Deploy — Setup Wizard
# =============================================================================

set -euo pipefail

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
title()   { echo -e "\n${BOLD}$1${NC}"; }
banner()  {
  echo ""
  echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}${WHITE}FIDScript Deploy — Setup Wizard${NC}"
  echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
}
divider() { echo -e "${DIM}$(printf '  ─%.0s' {1..64})${NC}"; }

# ── Helpers ────────────────────────────────────────────────────────────────────
# The Cloudflare client and the DNS/summary helpers live next to this file.
# shellcheck source=./cloudflare.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/cloudflare.sh"
# shellcheck source=./dns.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dns.sh"

CF_ZONE_ID=""; CF_ZONE_NAME=""
# Shell variables used by the top-level steps below.
ns=""; addons_list=(); label=""; host=""; record=""; target=""; when=""; hname=""

# ── Defaults ────────────────────────────────────────────────────────────────────
DOMAIN=""; ADMIN_EMAIL=""; ADMIN_PASSWORD=""
CLOUDFLARE_API_TOKEN=""
SERVER_IP=""; DETECTED_IP=""; DOCKER_GID="0"
SELECTED_ADDONS=()

# ── Detect environment ─────────────────────────────────────────────────────────
detect_env() {
  title "Environment"
  divider

  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    info "OS: $PRETTY_NAME ($ID)"
  else
    error "Cannot detect OS. Ubuntu 22.04+ or Debian 11+ required."
    exit 1
  fi

  DETECTED_IP="$(curl -s -m 8 https://api.ipify.org 2>/dev/null || \
                 curl -s -m 8 https://ifconfig.me 2>/dev/null || true)"
  if [[ -n "$DETECTED_IP" ]]; then
    info "Public IP: $DETECTED_IP (auto-detected)"
  else
    warn "Could not auto-detect public IP"
  fi

  DOCKER_GID="$(getent group docker 2>/dev/null | cut -d: -f3)" || DOCKER_GID="0"
  info "Docker GID: $DOCKER_GID"
}

# ── Step 1: Domain ───────────────────────────────────────────────────────────
step_domain() {
  title "Step 1 / 7 — Platform Domain"
  divider
  echo "  The domain where this platform will live. DNS A records will be"
  echo "  created automatically if using Cloudflare (Step 4)."
  echo ""
  prompt "Platform domain [${DETECTED_IP:-deploy.example.com}]: "
  read -r d
  d="${d:-${DETECTED_IP:-deploy.example.com}}"
  DOMAIN="$d"
  info "Domain: $DOMAIN"
}

# ── Step 2: Admin email ──────────────────────────────────────────────────────
step_email() {
  title "Step 2 / 7 — Administrator Account"
  divider
  echo "  Platform alerts and login username."
  echo ""
  prompt "Admin email: "
  read -r e
  while [[ ! "$e" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
    error "Invalid format."
    prompt "Admin email: "
    read -r e
  done
  ADMIN_EMAIL="$e"
  info "Admin email: $ADMIN_EMAIL"
}

# ── Step 3: Password ─────────────────────────────────────────────────────────
step_password() {
  title "Step 3 / 7 — Admin Password"
  divider
  echo "  Minimum 12 characters. Shown as dots."
  echo ""
  while true; do
    prompt "Password (min 12 chars): "
    read -r -s p1; echo ""
    if [[ ${#p1} -lt 12 ]]; then
      error "Too short."
      continue
    fi
    prompt "Confirm: "
    read -r -s p2; echo ""
    if [[ "$p1" != "$p2" ]]; then
      error "Mismatch."
      continue
    fi
    ADMIN_PASSWORD="$p1"; break
  done
  info "Password set."
}

# ── Step 4: Cloudflare account ───────────────────────────────────────────────
# The platform publishes every service on one domain and needs DNS for it.
# Rather than asking the operator to create records by hand, we ask for a
# Cloudflare API token and create them ourselves — and Cloudflare issues the
# TLS certificates.
step_cloudflare() {
  title "Step 4 / 7 — Cloudflare account"
  divider
  echo "  Your platform is published on one domain, and Cloudflare will hold"
  echo "  the DNS records for it and issue the TLS certificates."
  echo ""

  local zones zone_id zone_name picked

  while true; do
    echo "  Create an API token:"
    echo ""
    echo "      $(cf_token_create_url)"
    echo ""
    echo "    with these permissions:"
    cf_permissions_help
    echo ""
    prompt "Paste the API token (Enter to skip Cloudflare): "
    read -r -s CLOUDFLARE_API_TOKEN; echo ""

    if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
      warn "Skipped — you will have to create the DNS records yourself."
      warn "The full list is in installer/config/services.tsv."
      CF_ZONE_ID=""
      CF_ZONE_NAME=""
      return
    fi

    if ! cf_verify_token; then
      error "That token was not accepted. Check the permissions and try again."
      continue
    fi

    step "Token accepted. Zones this account can manage:"
    zones="$(cf_list_zones)"
    if [[ -z "$zones" ]]; then
      warn "This token cannot see any zones."
      warn "Add the domain to Cloudflare first, or check the token's Zone permissions."
      CLOUDFLARE_API_TOKEN=""
      continue
    fi

    local id name
    while IFS=$'\t' read -r id name; do
      [[ -z "$id" ]] && continue
      printf '      %s\n' "$name"
    done <<< "$zones"

    echo ""
    prompt "Which zone is the platform domain in? [type it]: "
    read -r picked
    picked="${picked,,}"
    picked="${picked#https://}"; picked="${picked#http://}"; picked="${picked%/}"
    picked="${picked%%/*}"

    zone_id="$(cf_find_zone "$picked")"
    if [[ -z "$zone_id" ]]; then
      error "No zone in this account covers ${picked}."
      error "Add the domain to Cloudflare (nameservers are assigned when you do),"
      error "or pick one of the zones listed above."
      CLOUDFLARE_API_TOKEN=""
      continue
    fi
    zone_name="$(echo "$zones" | awk -F'\t' -v z="$zone_id" '$1==z {print $2}')"

    CF_ZONE_ID="$zone_id"
    CF_ZONE_NAME="$zone_name"
    info "Using zone: ${zone_name}"
    return
  done
}

# ── Step 5: Optional components ──────────────────────────────────────────────
step_addons() {
  local ADDONS_ROOT
  ADDONS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../addons" 2>/dev/null && pwd)" || ADDONS_ROOT=""
  title "Step 5 / 7 — Optional components"
  divider
  echo "  These install alongside the platform. They are optional — the"
  echo "  core platform does not need them."
  echo ""

  local ids=() id title summary n=1 choice
  while read -r id; do
    [[ -z "$id" ]] && continue
    ids+=("$id")
    title="$(awk -v k="^title:" '$0 ~ k { sub(/^title:[[:space:]]*/, ""); print; exit }' \
      "${ADDONS_ROOT}/${id}/addon.yml" 2>/dev/null)"
    summary="$(awk -v k="^summary:" '$0 ~ k { sub(/^summary:[[:space:]]*/, ""); print; exit }' \
      "${ADDONS_ROOT}/${id}/addon.yml" 2>/dev/null)"
    echo "  ${n}) ${title}"
    echo "     ${summary}"
    n=$((n + 1))
  done < <(find "${ADDONS_ROOT}" -mindepth 2 -maxdepth 2 -name addon.yml 2>/dev/null \
           | xargs -r -n1 dirname | xargs -r -n1 basename | sort)

  if [[ ${#ids[@]} -eq 0 ]]; then
    info "No add-ons are available in this install."
    return
  fi

  echo ""
  prompt "Add-ons to install (numbers, comma separated, empty for none): "
  read -r choice

  local selected=() i
  for i in $(echo "$choice" | tr ',' ' '); do
    [[ "$i" =~ ^[0-9]+$ ]] || continue
    local idx=$((i - 1))
    if [[ $idx -ge 0 && $idx -lt ${#ids[@]} ]]; then
      selected+=("${ids[$idx]}")
    else
      warn "No add-on number ${i}"
    fi
  done

  if [[ ${#selected[@]} -eq 0 ]]; then
    info "Skipped — no optional components."
    return
  fi

  # The selection is applied after .env has been written: addons.sh records
  # it in .env, and the wizard writes .env itself further down — which would
  # otherwise overwrite the record.
  SELECTED_ADDONS=("${selected[@]}")
}

# ── Step 6: Review ───────────────────────────────────────────────────────────
step_review() {
  title "Step 6 / 7 — Review"
  divider
  echo "  Domain:       $DOMAIN"
  echo "  Admin:       $ADMIN_EMAIL"
  if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
    echo -e "  DNS:         ${GREEN}Cloudflare (auto)${NC}"
  else
    echo -e "  DNS:         ${YELLOW}Manual (HTTP-01 SSL)${NC}"
  fi
  echo "  Server IP:   ${DETECTED_IP:-[unknown]}"
  local chosen=""
  if [[ ${#SELECTED_ADDONS[@]} -gt 0 ]]; then
    chosen="${SELECTED_ADDONS[*]}"
  fi
  echo "  Add-ons:     ${chosen:-none}"
  echo ""
  prompt "Deploy now? [Y/n]: "
  read -r c; c="${c:-Y}"
  # NOTE: this must be an `if`, not `[[ ... ]] && { ...; }`. As the last
  # command of a function, a false `[[ ]]` makes the FUNCTION return 1,
  # and `set -e` then kills the script at the call site — so answering
  # "Y" (the normal case) used to abort the wizard before it wrote a
  # single config file.
  if [[ ! "$c" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────────
banner
echo -e "  ${DIM}Creates a full deployment platform on this server in ~5 minutes.${NC}"
echo ""

# ── Wizard ──────────────────────────────────────────────────────────────────
detect_env
step_domain
step_email
step_password
step_cloudflare
step_addons
step_review

# ── Generate secrets ────────────────────────────────────────────────────────
title "Generating secrets"
step "Creating credentials..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")/docker"
SECRETS_DIR="$DOCKER_DIR/secrets"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# Generate a secret ONLY if the file is missing or empty. Re-running this
# wizard on an existing deployment MUST NOT rotate credentials — that would
# invalidate all sessions, break DB connections, and lock the operator out.

# A platform database volume that already exists but has no local
# credential is a trap: generating a fresh password would lock the platform
# out of its own database, and the failure only shows up as an
# "authentication failed" much later. Refuse instead.
guard_existing_volume() {
  local volume="$1" secret_file="$2" secrets_dir="$3"
  [[ -s "$secret_file" ]] && return 0
  docker volume inspect "$volume" >/dev/null 2>&1 || return 0
  error "The volume '${volume}' already exists but its credentials are missing"
  error "from ${secrets_dir}."
  error ""
  error "  Restore the previous secrets/ directory, or remove the volume to"
  error "  start over — this DESTROYS the data in it:"
  error "    docker volume rm ${volume}"
  exit 1
}

generate_secret() {
  local file="$1" hex_bytes="$2"
  if [[ -s "$file" ]]; then
    info "Keeping existing $(basename "$file")"
    return
  fi
  openssl rand -hex "$hex_bytes" > "$file"
  chmod 600 "$file"
  info "Generated $(basename "$file")"
}

# Every volume that holds state created with a credential we generate. If
# the volume is there but the credential is not, generating a fresh one
# breaks the service against its own data.
guard_existing_volume "fidscript_postgres"  "$SECRETS_DIR/postgres_password.txt"     "$SECRETS_DIR"
guard_existing_volume "fidscript_redis"    "$SECRETS_DIR/redis_password.txt"        "$SECRETS_DIR"
guard_existing_volume "fidscript_stalwart" "$SECRETS_DIR/stalwart_admin_token.txt"  "$SECRETS_DIR"

generate_secret "$SECRETS_DIR/postgres_password.txt"     32
generate_secret "$SECRETS_DIR/redis_password.txt"        32
generate_secret "$SECRETS_DIR/minio_access_key.txt"      32
generate_secret "$SECRETS_DIR/minio_secret_key.txt"      32
generate_secret "$SECRETS_DIR/jwt_secret.txt"            64
generate_secret "$SECRETS_DIR/stalwart_admin_token.txt"  32
generate_secret "$SECRETS_DIR/stalwart_webhook_secret.txt" 32

# The AES-256-GCM key is NOT a hex secret. CryptoService does
# Buffer.from(value, 'base64') and rejects anything that is not exactly
# 32 bytes, so the value has to be base64 of 32 random bytes (44 chars).
# A hex string of the same entropy decodes to 48 bytes and the API
# crash-loops at bootstrap with "ENCRYPTION_KEY must be 32 bytes".
if [[ -s "$SECRETS_DIR/encryption_key.txt" ]]; then
  info "Keeping existing encryption_key.txt"
else
  openssl rand -base64 32 > "$SECRETS_DIR/encryption_key.txt"
  chmod 600 "$SECRETS_DIR/encryption_key.txt"
  info "Generated encryption_key.txt"
fi

STALWART_ADMIN_TOKEN="$(cat "$SECRETS_DIR/stalwart_admin_token.txt")"
if [[ ! -s "$SECRETS_DIR/system_mailbox_password.txt" ]]; then
  SYSTEM_MAILBOX_PASSWORD="$(openssl rand -base64 24 | tr -d '/=' | head -c 32)"
  echo "$SYSTEM_MAILBOX_PASSWORD" > "$SECRETS_DIR/system_mailbox_password.txt"
  chmod 600 "$SECRETS_DIR/system_mailbox_password.txt"
fi
# Cloudflare token — never auto-rotated (operator's secret). Only set if empty.
if [[ ! -s "$SECRETS_DIR/cf_api_token.txt" && -n "$CLOUDFLARE_API_TOKEN" ]]; then
  echo "$CLOUDFLARE_API_TOKEN" > "$SECRETS_DIR/cf_api_token.txt"
  chmod 600 "$SECRETS_DIR/cf_api_token.txt"
fi
# SMTP submission user/pass derive from the (now-stable) stalwart admin token.
echo "admin" > "$SECRETS_DIR/smtp_submission_user.txt"
echo "$STALWART_ADMIN_TOKEN" > "$SECRETS_DIR/smtp_submission_pass.txt"
echo "admin $STALWART_ADMIN_TOKEN" > "$SECRETS_DIR/stalwart_credentials.txt"
chmod 600 "$SECRETS_DIR"/smtp_submission_user.txt \
          "$SECRETS_DIR"/smtp_submission_pass.txt \
          "$SECRETS_DIR"/stalwart_credentials.txt

# Docker's `secrets:` block and the API's *_FILE convention both point at
# the secret name WITHOUT the .txt extension (e.g. /run/secrets/jwt_secret),
# while the generated files are .txt. Create a relative symlink for each so
# both spellings resolve. Without this the API's entrypoint cannot find
# JWT_SECRET / ENCRYPTION_KEY / DB_ADMIN_PASSWORD and the container
# crash-loops on startup.
for _txt in "$SECRETS_DIR"/*.txt; do
  [[ -f "$_txt" ]] || continue
  _base="$(basename "$_txt" .txt)"
  [[ -L "$SECRETS_DIR/$_base" ]] && continue
  ln -sf "$(basename "$_txt")" "$SECRETS_DIR/$_base"
done
info "Secrets ensured."

# ── Load values ─────────────────────────────────────────────────────────────
POSTGRES_PASSWORD="$(cat "$SECRETS_DIR/postgres_password.txt")"
REDIS_PASSWORD="$(cat "$SECRETS_DIR/redis_password.txt")"
MINIO_ACCESS_KEY="$(cat "$SECRETS_DIR/minio_access_key.txt")"
MINIO_SECRET_KEY="$(cat "$SECRETS_DIR/minio_secret_key.txt")"

# ── Write .env ──────────────────────────────────────────────────────────────
title "Writing configuration"
cat > "$DOCKER_DIR/.env" << ENVEOF
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
SERVER_IP=${DETECTED_IP:-$SERVER_IP}
PLATFORM_DOMAIN=$DOMAIN
PLATFORM_MAIL_HOST=mail.$DOMAIN
SMTP_SUBMISSION_USER=admin
SMTP_SUBMISSION_PASS=$STALWART_ADMIN_TOKEN
STALWART_RECOVERY_ADMIN=admin:$STALWART_ADMIN_TOKEN
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_EXTERNAL_ENDPOINT=https://storage.$DOMAIN
DOCKER_GID=$DOCKER_GID
# ── Instant BaaS — the project's data plane ────────────────────────────────
# The superuser signs in with the same address as the platform's admin.
# The platform's api reaches the server over the shared Docker network and
# the public URL is what browsers and deployed applications connect to.
INSTANT_SUPERUSER_EMAIL=$ADMIN_EMAIL
INSTANT_API_HOST=http://fidscript_instant_server:8888
INSTANT_PUBLIC_API_HOST=https://apiinstant.$DOMAIN
INSTANT_DASH_HOST=https://instant.$DOMAIN
INSTANT_BACKEND_URL=https://apiinstant.$DOMAIN
INSTANT_DASHBOARD_URL=https://instant.$DOMAIN
ENVEOF

# Write api.env ONLY if absent. Re-running the wizard on an existing
# deployment would otherwise overwrite GITHUB_CLIENT_ID/SECRET (the operator
# already entered real OAuth credentials after first install) and force a
# rotation of every env it contains. Compose reads it via env_file, so any
# change here forces a container recreate.
if [[ ! -f "$SECRETS_DIR/api.env" ]]; then
  cat > "$SECRETS_DIR/api.env" << APIENV
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
SMTP_SUBMISSION_USER=admin
SMTP_SUBMISSION_PASS=$STALWART_ADMIN_TOKEN
SYSTEM_MAILBOX_PASSWORD=$SYSTEM_MAILBOX_PASSWORD
# GitHub OAuth — replace with your real credentials from github.com/settings/developers
# Callback URL: https://api.\${DOMAIN}/api/v1/users/me/github/callback
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-REPLACE_WITH_YOUR_GITHUB_OAUTH_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-REPLACE_WITH_YOUR_GITHUB_OAUTH_CLIENT_SECRET}
APIENV
  chmod 600 "$SECRETS_DIR/api.env"
  info "api.env written."
else
  info "Keeping existing api.env — OAuth credentials preserved."
fi

# ── pgbouncer auth file ────────────────────────────────────────────────────
# pgbouncer runs as uid 70 (postgres) in the official image and reads this
# file directly. Docker preserves the host file's mode on a bind mount, so a
# 0600 root-owned file is unreadable inside the container and every
# connection fails with 'no such user: fidscript'.
#
# It lives in secrets/ (mode 700 on the host, so it is not readable by other
# local users) and is mounted into the container as a Docker secret.
PGBOUNCER_UID=70
PGBOUNCER_GID=70
cat > "$SECRETS_DIR/pgbouncer_userlist.txt" << EOF
"fidscript" "${POSTGRES_PASSWORD}"
EOF
chmod 640 "$SECRETS_DIR/pgbouncer_userlist.txt"
if [[ $EUID -eq 0 ]]; then
  chown "${PGBOUNCER_UID}:${PGBOUNCER_GID}" "$SECRETS_DIR/pgbouncer_userlist.txt" 2>/dev/null || true
else
  # Not root — cannot change ownership, so fall back to a mode pgbouncer
  # can read. The secrets/ directory is 0700, which keeps it off other
  # local users' eyes on the host.
  chmod 644 "$SECRETS_DIR/pgbouncer_userlist.txt" 2>/dev/null || true
fi
info ".env written."

# Apply the optional components chosen in step 5. This has to happen after
# .env exists, because the selection itself is recorded there.
if [[ ${#SELECTED_ADDONS[@]} -gt 0 ]]; then
  step "Preparing optional components…"
  bash "$(dirname "${BASH_SOURCE[0]}")/addons.sh" select "${SELECTED_ADDONS[@]}" || {
    warn "Could not prepare every add-on — continuing with the core platform."
  }
fi

# ── DNS records ─────────────────────────────────────────────────────────────
# The records for every service the platform publishes come from
# installer/config/services.tsv, so the list of hostnames lives in one
# place instead of being scattered through this script.
if [[ -n "$CF_ZONE_ID" && -n "$CLOUDFLARE_API_TOKEN" ]]; then
  title "Nameservers"
  divider
  ns="$(cf_zone_nameservers "$CF_ZONE_ID")"
  if [[ -n "$ns" ]]; then
    echo "  Cloudflare has assigned these nameservers for ${CF_ZONE_NAME}:"
    echo "$ns" | while read -r n; do echo "      ${n}"; done
    echo ""
    echo "  If ${CF_ZONE_NAME} is not already using them, point the domain's"
    echo "  nameservers at Cloudflare — at your registrar, not here. DNS will"
    echo "  not work until that has propagated (usually minutes, sometimes"
    echo "  up to a day)."
  fi
  echo ""

  title "Creating DNS records"
  addons_list=()
  if [[ ${#SELECTED_ADDONS[@]} -gt 0 ]]; then
    addons_list=("${SELECTED_ADDONS[@]}")
  fi
  if create_dns_records "$CF_ZONE_ID" "$DOMAIN" "$DETECTED_IP" "${addons_list[@]}"; then
    info "${DNS_CREATED} record(s) created."
  else
    warn "${DNS_FAILED} record(s) could not be created — see the list above."
    warn "You can create them by hand from installer/config/services.tsv."
  fi
else
  title "DNS records"
  warn "No Cloudflare account connected — create these records by hand:"
  echo ""
  while IFS=$'\t' read -r label host record target when link; do
    [[ -z "$label" ]] && continue
    hname="$(service_hostname "$host" "$DOMAIN")"
    printf '    %-5s %-34s → %s\n' "$record" "$hname" "$DETECTED_IP"
  done < <(all_services)
  echo ""
fi

# ── Traefik config ──────────────────────────────────────────────────────────
title "Writing Traefik configuration"
TRAEFIK_DIR="$DOCKER_DIR/traefik"
mkdir -p "$TRAEFIK_DIR/certs"
# The dynamic configuration lives in its own subdirectory: Traefik's file
# provider reads every YAML file in the directory it is pointed at, so the
# platform's routing and the deployments' routing cannot overwrite each
# other.
TRAEFIK_DYNAMIC_DIR="$TRAEFIK_DIR/dynamic"
mkdir -p "$TRAEFIK_DYNAMIC_DIR"

if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
  CERT_RESOLVER="letsencrypt-dns"
else
  CERT_RESOLVER="letsencrypt-http"
fi

# NOTE: the heredoc is QUOTED (<< 'HEREDOC') on purpose. Traefik rules are
# delimited by backticks — `Host(`app.example.com`)` — and in an unquoted
# heredoc the shell treats those backticks as COMMAND SUBSTITUTION and
# replaces the rule argument with the (empty) output of the command. That
# produced rules like `Host()`, which Traefik rejects with "no args for
# matcher Host" and every route 404s.
#
# The quoted heredoc leaves the backticks alone; the domain and the
# certificate resolver are substituted afterwards with placeholders.
cat > "$TRAEFIK_DYNAMIC_DIR/platform.yml" << 'HEREDOC'
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
    # ── Dashboard (app subdomain) — must come BEFORE wildcard ─────────────────
    dashboard-app:
      rule: 'Host(`app.__DOMAIN__`)'
      service: dashboard
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: __CERT_RESOLVER__
      priority: 20
    # ── Landing / marketing (root domain) ────────────────────────────────────
    dashboard-root:
      rule: 'Host(`__DOMAIN__`)'
      service: dashboard
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: __CERT_RESOLVER__
      priority: 10
    # ── Per-deployment subdomains: 2+ label subdomain → API ──────────────────
    # Matches: foo.${DOMAIN}, bar.${DOMAIN} etc. (NOT: app.${DOMAIN}, api.${DOMAIN})
    deployments-wildcard:
      rule: 'HostRegexp(`^[^.]+\.[^.]+\.__DOMAIN__$`)'
      service: api
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: __CERT_RESOLVER__
      priority: 5
    # ── API path prefix → API backend ─────────────────────────────────────────
    api:
      rule: 'PathPrefix(`/api`) && !Path(`/install.sh`)'
      service: api
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: __CERT_RESOLVER__
    # ── Install script endpoint ─────────────────────────────────────────────────
    install-sh:
      rule: 'Path(`/install.sh`)'
      service: api
      priority: 200
    # ── Metrics endpoint ──────────────────────────────────────────────────────
    metrics:
      rule: 'Host(`__DOMAIN__`) && PathPrefix(`/metrics`)'
      service: api
      middlewares:
        - security-headers
      tls:
        certResolver: __CERT_RESOLVER__
    # ── MinIO console ─────────────────────────────────────────────────────────
    minio-console:
      rule: 'Host(`storage.__DOMAIN__`)'
      service: minio-console
      middlewares:
        - security-headers
        - compress
      tls:
        certResolver: __CERT_RESOLVER__
    # ── Stalwart JMAP ────────────────────────────────────────────────────────
    jmap:
      rule: 'Host(`jmap.__DOMAIN__`)'
      service: stalwart-jmap
      middlewares:
        - security-headers
      tls:
        certResolver: __CERT_RESOLVER__
    # ── Stalwart admin console ───────────────────────────────────────────────
    # The same HTTP listener as the JMAP route — the console is a path on
    # it, not a separate service. The DNS record and the summary link both
    # promise this hostname, so it needs a router of its own.
    stalwart-admin:
      rule: 'Host(`stalwart-admin.__DOMAIN__`)'
      service: stalwart-jmap
      middlewares:
        - security-headers
      tls:
        certResolver: __CERT_RESOLVER__
    # ── ACME challenge (Let's Encrypt) ────────────────────────────────────────
    acme-challenge:
      rule: 'PathPrefix(`/.well-known/acme-challenge/`)'
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
sed -i "s|__DOMAIN__|${DOMAIN}|g; s|__CERT_RESOLVER__|${CERT_RESOLVER}|g" "$TRAEFIK_DYNAMIC_DIR/platform.yml"
info "Traefik dynamic config written (resolver: $CERT_RESOLVER)."

# The static routes for the other products that share this host. Traefik is
# the single edge, so the Instant console, the WhatsApp console, the npm
# registry and the Maven repository are all reachable through it.
if [[ -f "$(dirname "$SCRIPT_DIR")/config/traefik/products.yml" ]]; then
  cp "$(dirname "$SCRIPT_DIR")/config/traefik/products.yml" "$TRAEFIK_DYNAMIC_DIR/products.yml"
  sed -i "s|__DOMAIN__|${DOMAIN}|g" "$TRAEFIK_DYNAMIC_DIR/products.yml"
  info "Product routes written."
fi

# Traefik joins the networks those products run on. Compose refuses to start
# if an external network does not exist, so create them when the products
# are not installed — an empty network is harmless.
for _net in self-hosting_self-hosting_default next-mavens-evolution-api_platform-net nextmavens-registry_default; do
  docker network inspect "$_net" >/dev/null 2>&1 || docker network create "$_net" >/dev/null 2>&1 || true
done

# The Instant BaaS — the project's data plane. The api joins this network
# so it can provision an Instant app without going out through the edge.
docker network inspect fidscript-instant >/dev/null 2>&1 || docker network create fidscript-instant >/dev/null 2>&1 || true

# ── Traefik static ─────────────────────────────────────────────────────────
# NOTE: the `docker` provider below is NOT optional. Every deployed
# application is published by setting `traefik.enable=true` labels on its
# container; without this provider Traefik never discovers those
# containers and no deployment ever gets a working URL. The wizard
# previously overwrote this file with a file-provider-only version and
# silently broke per-deployment routing.
cat > "$TRAEFIK_DIR/traefik.yml" << EOF
api:
  dashboard: true
  # The Traefik API is exposed unauthenticated on :8080 to every container
  # on the platform networks. Keep it closed — the read-only dashboard is
  # still available, but the control API is not reachable.
  insecure: false
entryPoints:
  # The internal entrypoint Traefik's own /ping endpoint binds to. It is
  # NOT published to the host — it exists so the healthcheck has something
  # to probe, and so traefik healthcheck --ping works.
  traefik:
    address: ":8080"
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
# The ping endpoint the healthcheck probes. It is enabled here rather than
# with a --ping flag: the image's entrypoint rewrites a flag-only command
# line into traefik traefik --ping=true, and the flag is then swallowed
# as an argument instead of being applied.
ping:
  entryPoint: traefik

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
      caServer: https://acme-v02.api.letsencrypt.org/directory
  letsencrypt-http:
    acme:
      email: $ADMIN_EMAIL
      storage: /acme-http/acme-http.json
      httpChallenge:
        entryPoint: web
      caServer: https://acme-v02.api.letsencrypt.org/directory
providers:
  file:
    # A DIRECTORY: Traefik's file provider reads every .yml/.toml file in
    # it, so the platform's routing (platform.yml) and the deployments'
    # routing (dynamic-deployments.yml) never overwrite each other.
    # The option is directory, not filename — filename with a
    # directory path fails with "read ...: is a directory".
    directory: /etc/traefik/dynamic
    watch: true
  # Docker provider — via a socat TCP proxy that bridges the raw unix socket
  # to TCP. Over TCP the Go Docker client negotiates the API version
  # automatically (unlike the raw socket where it pins to 1.24).
  docker:
    endpoint: "http://fidscript_docker_tcp:2375"
    exposedByDefault: false
    network: fidscript-deployment
EOF

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║${NC}  ${BOLD}${WHITE}Configuration saved — ready to deploy${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}To start the platform:${NC}"
echo -e "  ${CYAN}  cd $DOCKER_DIR && sudo docker compose up -d --build${NC}"
echo ""

# The links. The operator is told to open the dashboard, so it comes first.
print_summary "$DOMAIN" "${SELECTED_ADDONS[@]}"

