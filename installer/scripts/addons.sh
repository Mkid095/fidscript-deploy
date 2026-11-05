#!/usr/bin/env bash
# =============================================================================
# FIDScript Deploy — add-on manager
# =============================================================================
#
# Optional components that can be installed alongside the core platform:
# observability, a realtime database, the WhatsApp platform, an app runtime.
#
# Usage:
#   fidscript-addons list
#   fidscript-addons enable   <id> [<id>...]
#   fidscript-addons disable  <id> [<id>...]
#   fidscript-addons status
#   fidscript-addons apply            # (re)start the core + enabled add-ons
#
# The selection is stored in installer/docker/.env as FIDScript_ADDONS="a,b".
# Secrets for an add-on are generated on enable into
# installer/docker/secrets/<id>_<name>.txt.
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_DIR="${INSTALLER_DIR}/docker"
ADDONS_DIR="${INSTALLER_DIR}/addons"
ENV_FILE="${DOCKER_DIR}/.env"
SECRETS_DIR="${DOCKER_DIR}/secrets"
CORE_COMPOSE="${DOCKER_DIR}/docker-compose.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YEL='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

info()  { echo -e "  ${GREEN}✓${NC}  $*"; }
warn()  { echo -e "  ${YEL}!${NC}  $*"; }
error() { echo -e "  ${RED}✗${NC}  $*" >&2; }
step()  { echo -e "\n  ${CYAN}▶${NC}  $*"; }
title() { echo -e "\n${BOLD}${CYAN}━━━ ${*} ━━━${NC}"; }

die() { error "$*"; exit 1; }

# ── Manifest reading ─────────────────────────────────────────────────────────
# The manifests are a deliberately small, flat subset of YAML so they can be
# read with awk — no YAML parser is guaranteed on a fresh VPS.

manifest_path() { echo "${ADDONS_DIR}/$1/addon.yml"; }

manifest_get() {   # manifest_get <id> <key> -> scalar value
  local id="$1" key="$2"
  [[ -f "$(manifest_path "$id")" ]] || return 1
  sed -n "/^${key}:/,\$p" "$(manifest_path "$id")" \
    | grep -m1 "^${key}:" | cut -d: -f2- | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

manifest_list() {  # manifest_list <id> <key> -> one item per line
  local id="$1" key="$2"
  [[ -f "$(manifest_path "$id")" ]] || return 1
  awk -v k="^${key}:[[:space:]]*$" '
    $0 ~ k { inblock = 1; next }
    inblock && /^[^[:space:]]/ { exit }
    inblock && /^[[:space:]]*-[[:space:]]*/ {
      sub(/^[[:space:]]*-[[:space:]]*/, ""); print
    }
  ' "$(manifest_path "$id")"
}

manifest_map() {   # manifest_map <id> <key> -> "name<TAB>bytes<TAB>uid" per line
  # Two forms are accepted:
  #   name: 32                       -> bytes of hex entropy, no owner change
  #   name: {bytes: 32, uid: 472}    -> ...and chown the file to that uid
  local id="$1" key="$2"
  [[ -f "$(manifest_path "$id")" ]] || return 1
  awk -v k="^${key}:[[:space:]]*$" '
    $0 ~ k { inblock = 1; next }
    inblock && /^[^[:space:]]/ { exit }
    inblock && /^  [A-Za-z0-9_-]+:[[:space:]]*[0-9]+[[:space:]]*$/ {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      split(line, a, ":")
      gsub(/[[:space:]]/, "", a[2])
      print a[1] "\t" a[2] "\t0\thex"
    }
    inblock && /^  [A-Za-z0-9_-]+:[[:space:]]*\{/ {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      split(line, a, ":")
      name = a[1]
      gsub(/[[:space:]]/, "", name)
      bytes = 0; uid = 0; type = "hex"
      if (match(line, /bytes:[[:space:]]*[0-9]+/)) {
        b = substr(line, RSTART, RLENGTH); gsub(/[^0-9]/, "", b); bytes = b
      }
      if (match(line, /uid:[[:space:]]*[0-9]+/)) {
        u = substr(line, RSTART, RLENGTH); gsub(/[^0-9]/, "", u); uid = u
      }
      if (match(line, /type:[[:space:]]*[a-z]+/)) {
        t = substr(line, RSTART, RLENGTH); sub(/^type:[[:space:]]*/, "", t); type = t
      }
      print name "\t" bytes "\t" uid "\t" type
    }
  ' "$(manifest_path "$id")"
}

# ── Available / enabled ──────────────────────────────────────────────────────
available_addons() {
  [[ -d "$ADDONS_DIR" ]] || return 0
  for d in "${ADDONS_DIR}"/*/; do
    [[ -f "${d}addon.yml" ]] || continue
    basename "$d"
  done | sort
}

enabled_addons() {
  [[ -f "$ENV_FILE" ]] || return 0
  # `grep -v` exits 1 when it filters every line out (the normal case:
  # nothing is enabled yet), and `set -e` would then kill the caller.
  # The value is stripped of its quotes first: a greedy sed match would
  # otherwise swallow the closing quote and leave it attached to the id.
  grep -m1 '^FIDScript_ADDONS=' "$ENV_FILE" 2>/dev/null \
    | cut -d= -f2- | tr -d '"' | tr ',' '\n' \
    | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$' || true
}

set_enabled_addons() {  # set_enabled_addons <space separated ids>
  local ids="$1" current new_line
  current="$(grep -c '^FIDScript_ADDONS=' "$ENV_FILE" 2>/dev/null || true)"
  current="${current:-0}"
  new_line="FIDScript_ADDONS=\"$(echo "$ids" | tr ' ' ',' | sed 's/,*$//')\""
  if [[ "$current" -gt 0 ]]; then
    # Replace in place with sed (portable, no perl dependency).
    sed -i "s|^FIDScript_ADDONS=.*|${new_line}|" "$ENV_FILE"
  else
    echo "$new_line" >> "$ENV_FILE"
  fi
}

# ── Validation ───────────────────────────────────────────────────────────────
validate_addon() {  # validate_addon <id>
  local id="$1" req conf port enabled
  [[ -f "$(manifest_path "$id")" ]] || { error "Unknown add-on: $id"; return 1; }
  [[ -f "${ADDONS_DIR}/${id}/docker-compose.addon.yml" ]] || {
    error "Add-on '${id}' has no docker-compose.addon.yml"; return 1; }

  enabled="$(enabled_addons | tr '\n' ' ')"

  while read -r req; do
    [[ -z "$req" ]] && continue
    if ! echo " $enabled " | grep -q " $req "; then
      error "Add-on '${id}' requires '${req}' — enable it first."; return 1
    fi
  done < <(manifest_list "$id" requires)

  while read -r conf; do
    [[ -z "$conf" ]] && continue
    if echo " $enabled " | grep -q " $conf "; then
      error "Add-on '${id}' conflicts with '${conf}' — disable that first."; return 1
    fi
  done < <(manifest_list "$id" conflicts)

  # Host ports — warn rather than fail, because the operator may be
  # deliberately running something else on that port.
  while read -r port; do
    [[ -z "$port" ]] && continue
    if ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}\$"; then
      warn "Port ${port} is already in use on this host — '${id}' may fail to start."
    fi
  done < <(manifest_list "$id" host_ports)

  return 0
}

# ── Env files ────────────────────────────────────────────────────────────────
# An add-on may ship a non-secret config template. It is copied into place
# on enable and never overwritten, so the operator's edits survive.
prepare_addon_env() {  # prepare_addon_env <id>
  local id="$1" example target
  for example in "${ADDONS_DIR}/${id}"/*.env.example; do
    [[ -f "$example" ]] || continue
    target="${example%.example}"
    if [[ -f "$target" ]]; then
      info "Keeping existing $(basename "$target")"
      continue
    fi
    cp "$example" "$target"
    chmod 600 "$target"
    info "Created $(basename "$target") from the template — edit it before starting."
  done
}

# ── Secrets ──────────────────────────────────────────────────────────────────
generate_addon_secrets() {  # generate_addon_secrets <id>
  local id="$1" name bytes uid type file slug
  # The file prefix uses underscores so it matches the names a compose
  # fragment can reference (an add-on id may contain a dash).
  slug="$(echo "$id" | tr '-' '_')"
  mkdir -p "$SECRETS_DIR"
  chmod 700 "$SECRETS_DIR"
  while IFS=$'\t' read -r name bytes uid type; do
    [[ -z "$name" ]] && continue
    file="${SECRETS_DIR}/${slug}_${name}.txt"
    if [[ ! -s "$file" ]]; then
      openssl rand -hex "$bytes" > "$file"
      chmod 600 "$file"
      info "Generated ${slug}_${name}.txt"
    else
      info "Keeping existing ${slug}_${name}.txt"
    fi
    # The value also goes into the installer's .env under
    # <ADDON>_<NAME>, because Compose interpolates ${VAR} in a compose file
    # from the project .env — an `env_file:` entry only sets container
    # variables, it does not feed interpolation.
    local env_name
    env_name="$(echo "${slug}_${name}" | tr 'a-z' 'A-Z')"
    if grep -q "^${env_name}=" "$ENV_FILE" 2>/dev/null; then
      sed -i "s|^${env_name}=.*|${env_name}=$(cat "$file")|" "$ENV_FILE"
    else
      echo "${env_name}=$(cat "$file")" >> "$ENV_FILE"
    fi

    # htpasswd: also write the `admin:<hash>` line that a registry's
    # basic-auth middleware expects, alongside the raw password.
    if [[ "${type:-hex}" == "htpasswd" ]]; then
      local htfile="${SECRETS_DIR}/${slug}_${name}_htpasswd.txt"
      if [[ ! -s "$htfile" ]]; then
        # The registry's htpasswd middleware only accepts bcrypt. Neither
        # openssl passwd -apr1 nor the {SHA} form is accepted — both come
        # back as 401 — so the hash has to be a real bcrypt one.
        local hash=""
        if python3 -c "import bcrypt" >/dev/null 2>&1; then
          hash="$(STALWART_PW="$(cat "$file")" python3 -c "
import os, bcrypt
print(bcrypt.hashpw(os.environ['STALWART_PW'].encode(), bcrypt.gensalt()).decode())
" 2>/dev/null)"
        elif command -v htpasswd >/dev/null 2>&1; then
          hash="$(htpasswd -Bbn admin "$(cat "$file")" | cut -d: -f2)"
        fi
        if [[ -z "$hash" ]]; then
          warn "Cannot generate a bcrypt hash — installing python3-bcrypt…"
          if [[ $EUID -eq 0 ]]; then
            apt-get install -y -qq python3-bcrypt >/dev/null 2>&1 || true
          else
            pip3 install --quiet --user bcrypt >/dev/null 2>&1 || true
          fi
          hash="$(STALWART_PW="$(cat "$file")" python3 -c "
import os, bcrypt
print(bcrypt.hashpw(os.environ['STALWART_PW'].encode(), bcrypt.gensalt()).decode())
" 2>/dev/null)"
        fi
        if [[ -z "$hash" ]]; then
          error "Could not bcrypt-hash the registry password."
          error "Install python3-bcrypt (apt-get install python3-bcrypt) and re-run."
          return 1
        fi
        printf 'admin:%s\n' "$hash" > "$htfile"
        chmod 600 "$htfile"
        info "Generated ${slug}_${name}_htpasswd.txt"
      else
        info "Keeping existing ${slug}_${name}_htpasswd.txt"
      fi
    fi
    # Docker preserves the host file's mode and owner on a bind mount, and
    # compose file-secrets are bind mounts too. A secret owned by the
    # installing user with mode 600 is unreadable by a service that runs
    # as a different uid (Grafana is 472, pgbouncer is 70) — so the
    # manifest can name the uid that has to own the file.
    if [[ "${uid:-0}" -gt 0 && $EUID -eq 0 ]]; then
      chown "${uid}:${uid}" "$file" 2>/dev/null || true
    elif [[ "${uid:-0}" -gt 0 ]]; then
      # Not root — cannot change ownership, so widen the mode instead.
      chmod 644 "$file" 2>/dev/null || true
    fi
  done < <(manifest_map "$id" secrets)
}

# ── Compose ──────────────────────────────────────────────────────────────────
# FIDScript_COMPOSE_EXTRA may hold a space-separated list of extra compose
# files to merge in after the core and the add-ons. It is how an operator
# overrides a published port or mounts an extra volume without editing the
# shipped compose file.
compose_file_args() {  # echo the -f arguments for the core + enabled add-ons
  local id extra
  echo -n "-f ${CORE_COMPOSE}"
  while read -r id; do
    [[ -z "$id" ]] && continue
    echo -n " -f ${ADDONS_DIR}/${id}/docker-compose.addon.yml"
  done < <(enabled_addons)
  for extra in ${FIDScript_COMPOSE_EXTRA:-}; do
    echo -n " -f ${extra}"
  done
}

# ── Commands ─────────────────────────────────────────────────────────────────
cmd_list() {
  title "Available add-ons"
  local id title summary state
  while read -r id; do
    [[ -z "$id" ]] && continue
    title="$(manifest_get "$id" title)"
    summary="$(manifest_get "$id" summary)"
    if enabled_addons | grep -qx "$id"; then state="${GREEN}enabled${NC}"; else state="${DIM}not installed${NC}"; fi
    echo -e "  ${BOLD}${id}${NC}  ${state}"
    echo -e "      ${title}"
    echo -e "      ${DIM}${summary}${NC}"
  done < <(available_addons)
  echo ""
}

# Record the selection without starting anything. The setup wizard uses this
# so it can collect the answer before the stack is brought up.
cmd_select() {
  [[ $# -gt 0 ]] || return 0
  local id current
  current="$(enabled_addons | tr '\n' ' ')"
  for id in "$@"; do
    validate_addon "$id" || exit 1
    prepare_addon_env "$id"
    generate_addon_secrets "$id"
    if echo " $current " | grep -q " $id "; then
      info "'${id}' is already selected"
    else
      current="${current}${id} "
      info "Selected '${id}'"
    fi
  done
  set_enabled_addons "$current"
}

cmd_enable() {
  [[ $# -gt 0 ]] || die "Usage: fidscript-addons enable <id> [<id>...] [--no-recreate]"
  # --no-recreate: bring the new application up without recreating the
  # containers that are already running. The platform installs applications
  # from its own dashboard, and it is running in one of those containers —
  # recreating it would kill the process that asked for the install.
  local recreate=1
  if [[ "${!#}" == "--no-recreate" ]]; then
    recreate=0
    set -- "${@:1:$(( $# - 1 ))}"
  fi
  cmd_select "$@"
  step "Applying…"
  cmd_apply "$recreate"
}

cmd_disable() {
  [[ $# -gt 0 ]] || die "Usage: fidscript-addons disable <id> [<id>...]"
  local id current
  current="$(enabled_addons | tr '\n' ' ')"
  for id in "$@"; do
    if echo " $current " | grep -q " $id "; then
      current="$(echo " $current " | sed "s| $id | |g" | tr -s ' ')"
      info "Disabled '${id}'"
    else
      warn "'${id}' was not enabled"
    fi
  done
  set_enabled_addons "$current"
}

cmd_status() {
  title "Add-on status"
  local id state
  while read -r id; do
    [[ -z "$id" ]] && continue
    if enabled_addons | grep -qx "$id"; then
      state="${GREEN}enabled${NC}"
    else
      state="${DIM}not installed${NC}"
    fi
    echo -e "  ${BOLD}${id}${NC}  ${state}"
  done < <(available_addons)
  echo ""
  step "Containers"
  # shellcheck disable=SC2046
  docker compose $(compose_file_args) ps --format '  {{.Service}}\t{{.Status}}' 2>/dev/null || true
  echo ""
}

cmd_apply() {
  # Make sure every enabled add-on's secrets exist before Compose starts —
  # a missing secret file is a hard error at container-create time.
  local id recreate="${1:-1}"
  while read -r id; do
    [[ -z "$id" ]] && continue
    prepare_addon_env "$id"
    generate_addon_secrets "$id"
  done < <(enabled_addons)
  # The Instant add-on's network is external — the platform's api joins it,
  # because it is what provisions an Instant app for a project. Compose
  # refuses to start when an external network is missing.
  if echo " $(enabled_addons | tr '\n' ' ') " | grep -q " instant "; then
    docker network inspect fidscript-instant >/dev/null 2>&1 \
      || docker network create fidscript-instant >/dev/null 2>&1 || true
  fi
  # shellcheck disable=SC2046
  if [[ "$recreate" == "1" ]]; then
    docker compose $(compose_file_args) up -d
  else
    docker compose $(compose_file_args) up -d --no-recreate
  fi
}

case "${1:-list}" in
  list)    shift || true; cmd_list "$@" ;;
  select)  shift || true; cmd_select "$@" ;;
  enable)  shift; cmd_enable "$@" ;;
  disable) shift; cmd_disable "$@" ;;
  status)  shift || true; cmd_status "$@" ;;
  apply)   shift || true; cmd_apply "$@" ;;
  *)       error "Unknown command: $1"; sed -n '8,16p' "$0"; exit 1 ;;
esac
