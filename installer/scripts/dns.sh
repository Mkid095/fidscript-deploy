#!/usr/bin/env bash
# =============================================================================
# FIDScript Deploy — DNS records and the setup summary
# =============================================================================
#
# Reads installer/config/services.tsv and creates the DNS records for the
# services the platform publishes, through the operator's Cloudflare
# account, then prints the links at the end of the setup.
#
# Sourced by setup-wizard.sh. Requires cloudflare.sh.
#
# =============================================================================

SERVICES_FILE="${SERVICES_FILE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/config/services.tsv}"

# services_for <when-filter> → the rows whose "when" column matches.
# A filter of "always" matches the core rows plus every add-on row; a
# filter of an add-on id matches only that add-on's rows.
services_for() {
  local want="$1"
  awk -F'\t' -v want="$want" '
    /^#/ { next }
    NF < 5 { next }
    {
      if ($5 == "always" || $5 == want) print
    }
  ' "$SERVICES_FILE"
}

# The full hostname for a row, given the platform domain.
service_hostname() {
  local host="$1" domain="$2"
  [[ "$host" == "." ]] && { echo "$domain"; return; }
  echo "${host}.${domain}"
}

# create_dns_records <zoneId> <domain> <serverIp> [add-on ids...]
# Creates (or updates) one record per service. Returns 0 if every record
# was created, 1 otherwise — the caller decides whether that is fatal.
create_dns_records() {
  local zone="$1" domain="$2" ip="$3"
  shift 3
  local addons=("$@")
  local created=0 failed=0 label host record target when hostname content

  while IFS=$'\t' read -r label host record target when; do
    [[ -z "$label" ]] && continue

    # Skip an add-on's services unless that add-on was installed.
    if [[ "$when" != "always" ]]; then
      local wanted=0 a
      for a in "${addons[@]}"; do [[ "$a" == "$when" ]] && wanted=1; done
      [[ "$wanted" -eq 0 ]] && continue
    fi

    hostname="$(service_hostname "$host" "$domain")"
    case "$target" in
      IP) content="$ip" ;;
      *)   content="$target" ;;
    esac

    if cf_upsert_record "$zone" "$hostname" "$record" "$content" "false"; then
      printf '  %s  %s\n' "$(printf '✓' | sed 's/^/  /')" "$hostname"
      created=$((created + 1))
    else
      printf '  %s  %s\n' "✗" "$hostname"
      failed=$((failed + 1))
    fi
  done < <(services_for always; for a in "${addons[@]}"; do services_for "$a"; done)

  DNS_CREATED="$created"
  DNS_FAILED="$failed"
  [[ "$failed" -eq 0 ]]
}

# print_summary <domain> <add-on ids...> — the links the operator needs.
print_summary() {
  local domain="$1"
  shift
  local addons=("$@")
  local label host record target when hostname

  echo ""
  echo "  ─────────────────────────────────────────────────────────────"
  echo "   Your platform is ready"
  echo "  ─────────────────────────────────────────────────────────────"
  echo ""

  while IFS=$'\t' read -r label host record target when; do
    [[ -z "$label" ]] && continue
    if [[ "$when" != "always" ]]; then
      local wanted=0 a
      for a in "${addons[@]}"; do [[ "$a" == "$when" ]] && wanted=1; done
      [[ "$wanted" -eq 0 ]] && continue
    fi
    hostname="$(service_hostname "$host" "$domain")"
    printf '   %-28s https://%s\n' "$label" "$hostname"
  done < <(services_for always; for a in "${addons[@]}"; do services_for "$a"; done)

  echo ""
  echo "   Open the dashboard, sign in with the administrator account, and"
  echo "   the setup guide walks you through the rest."
  echo ""
}
