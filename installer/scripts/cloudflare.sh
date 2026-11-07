#!/usr/bin/env bash
# =============================================================================
# FIDScript Deploy — Cloudflare API client
# =============================================================================
#
# A small shell client for the parts of the Cloudflare API the installer
# needs: verify a token, list the zones it can see, read the nameservers
# Cloudflare assigned, and create the DNS records for the platform's
# services.
#
# Sourced by setup-wizard.sh. It reads the token from
# $CLOUDFLARE_API_TOKEN and never writes it anywhere.
#
# =============================================================================

CF_API="https://api.cloudflare.com/client/v4"

# The token-creation link the operator is sent to. It pre-fills the token
# template with the permissions the platform actually needs:
#   Zone:DNS:Edit       — create the records for each service
#   Zone:Zone:Read      — find the zone and read its nameservers
#   Account:Account
#     Settings:Read      — some setups need to read the account
cf_token_create_url() {
  cat <<'URL'
https://dash.cloudflare.com/profile/api-tokens/create
URL
}

cf_permissions_help() {
  cat <<'HELP'
        Zone  ·  DNS  ·  Edit      — create the records for each service
        Zone  ·  Zone ·  Read     — find your zone and read its nameservers
        Zone  ·  Cache Purge · Edit — purge the cache when records change
HELP
}

# cf_request <METHOD> <PATH> [body]  → prints the JSON body, returns the
# HTTP status code in CF_STATUS.
cf_request() {
  local method="$1" path="$2" body="${3:-}"
  local tmp status
  tmp="$(mktemp)"
  if [[ -n "$body" ]]; then
    status="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
      "${CF_API}${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H 'Content-Type: application/json' \
      --data "$body" 2>/dev/null)" || status="000"
  else
    status="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
      "${CF_API}${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" 2>/dev/null)" || status="000"
  fi
  CF_STATUS="$status"
  CF_BODY="$(cat "$tmp")"
  rm -f "$tmp"
  return 0
}

# Prints "ok" or an error message.
cf_verify_token() {
  cf_request GET "/user/tokens/verify" || return 1
  if [[ "$CF_STATUS" != "200" ]]; then
    echo "The token was rejected (HTTP $CF_STATUS)."
    return 1
  fi
  if ! echo "$CF_BODY" | grep -q '"success":true'; then
    echo "The token was rejected by Cloudflare."
    return 1
  fi
  return 0
}

# cf_list_zones → one zone name per line (id<TAB>name)
cf_list_zones() {
  cf_request GET "/zones?per_page=50" || return 1
  echo "$CF_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if not d.get('success'):
    sys.exit(0)
for z in d.get('result', []):
    print(f\"{z['id']}\t{z['name']}\")
" 2>/dev/null
}

# cf_find_zone <domain> → the zone id that covers the domain, walking up
# the labels the way the platform's Cloudflare provider does
# (app.customer.com → customer.com → com).
cf_find_zone() {
  local domain="${1,,}"
  domain="${domain%.}"
  while [[ -n "$domain" && "$domain" != "." ]]; do
    local id
    id="$(cf_request GET "/zones?name=${domain}" >/dev/null; echo "$CF_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
r = d.get('result') or []
print(r[0]['id'] if r else '')
" 2>/dev/null)"
    if [[ -n "$id" ]]; then
      echo "$id"
      return 0
    fi
    domain="${domain#*.}"
  done
  return 1
}

# cf_zone_nameservers <zoneId> → the two nameservers Cloudflare assigned
cf_zone_nameservers() {
  cf_request GET "/zones/$1" || return 1
  echo "$CF_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for ns in (d.get('result') or {}).get('name_servers', []):
    print(ns)
" 2>/dev/null
}

# cf_record_exists <zoneId> <name> <type> → the record id, or empty
cf_record_exists() {
  cf_request GET "/zones/$1/dns_records?name=$2&type=$3" || return 1
  echo "$CF_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
r = d.get('result') or []
print(r[0]['id'] if r else '')
" 2>/dev/null
}

# cf_upsert_record <zoneId> <name> <type> <content> [proxied]
# Creates the record, or updates it if it already points somewhere else.
cf_upsert_record() {
  local zone="$1" name="$2" type="$3" content="$4" proxied="${5:-false}"
  local existing
  existing="$(cf_record_exists "$zone" "$name" "$type")"
  if [[ -n "$existing" ]]; then
    cf_request PUT "/zones/${zone}/dns_records/${existing}" \
      "{\"type\":\"${type}\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":3600,\"proxied\":${proxied}}" >/dev/null
    [[ "$CF_STATUS" == "200" ]] && return 0
    return 1
  fi
  cf_request POST "/zones/${zone}/dns_records" \
    "{\"type\":\"${type}\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":3600,\"proxied\":${proxied}}" >/dev/null
  [[ "$CF_STATUS" == "200" ]]
}
