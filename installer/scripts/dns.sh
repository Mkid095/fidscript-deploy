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

# services_for <when-filter> → the rows whose "when" column matches EXACTLY.
# The filter is exclusive on purpose: a caller that wants the core rows
# plus an add-on's rows asks for both, once each. Matching the core rows
# again for every add-on printed the whole core list once per add-on.
services_for() {
  local want="$1"
  awk -F'\t' -v want="$want" '
    /^#/ { next }
    NF < 5 { next }
    {
      if ($5 == want) print
    }
  ' "$SERVICES_FILE"
}

# Every row, whatever its "when" column — for the operator who is creating
# the records by hand and wants the full list.
all_services() {
  awk -F'\t' '
    /^#/ { next }
    NF < 5 { next }
    { print }
  ' "$SERVICES_FILE"
}

# The full hostname for a row, given the platform domain.
service_hostname() {
  local host="$1" domain="$2"
  [[ "$host" == "." ]] && { echo "$domain"; return; }
  echo "${host}.${domain}"
}

# What the summary prints for a service. The link column is a template
# with "{host}" (the full hostname) and "{domain}" (the platform's domain)
# in it; empty means the ordinary https URL.
service_link() {
  local template="$1" hostname="$2" domain="$3"
  [[ -z "$template" ]] && template="https://{host}"
  template="${template//\{host\}/$hostname}"
  echo "${template//\{domain\}/$domain}"
}

# create_dns_records <zoneId> <domain> <serverIp> [add-on ids...]
# Creates (or updates) one record per service. Returns 0 if every record
# was created, 1 otherwise — the caller decides whether that is fatal.
create_dns_records() {
  local zone="$1" domain="$2" ip="$3"
  shift 3
  local addons=("$@")
  local created=0 failed=0 label host record target when link hostname content

  while IFS=$'\t' read -r label host record target when link; do
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
  local label host record target when link hostname

  echo ""
  echo "  ─────────────────────────────────────────────────────────────"
  echo "   Your platform is ready"
  echo "  ─────────────────────────────────────────────────────────────"
  echo ""

  while IFS=$'\t' read -r label host record target when link; do
    [[ -z "$label" ]] && continue
    if [[ "$when" != "always" ]]; then
      local wanted=0 a
      for a in "${addons[@]}"; do [[ "$a" == "$when" ]] && wanted=1; done
      [[ "$wanted" -eq 0 ]] && continue
    fi
    hostname="$(service_hostname "$host" "$domain")"
    # The link column says what to print. It is not always a URL: SMTP and
    # IMAP are not served over HTTP, and a wildcard is a pattern.
    printf '   %-28s %s\n' "$label" "$(service_link "$link" "$hostname" "$domain")"
  done < <(services_for always; for a in "${addons[@]}"; do services_for "$a"; done)

  echo ""
  echo "   Open the dashboard, sign in with the administrator account, and"
  echo "   the setup guide walks you through the rest."
  echo ""
}
