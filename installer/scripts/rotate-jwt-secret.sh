#!/usr/bin/env bash
# Rotate the platform's JWT signing secret without logging anyone out.
#
# The API signs new tokens with the current secret, and verifies against
# the current plus — while the file exists — the previous one. So the
# procedure is: write the new secret, stage the old one as "previous",
# restart the API. In-flight and not-yet-expired tokens keep working on
# the old key for the rotation window; new sessions sign on the new key.
# After the window, remove the previous file and restart, and the old key
# is dead.
#
# Run from anywhere: it finds its own install.
set -euo pipefail

# installer/scripts/rotate-jwt-secret.sh -> installer/docker/secrets
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_DIR="$INSTALL_DIR/docker"
SECRETS="$COMPOSE_DIR/secrets"

if [ ! -f "$SECRETS/jwt_secret.txt" ]; then
  echo "error: $SECRETS/jwt_secret.txt not found — is this a FIDScript install?" >&2
  exit 1
fi

cd "$COMPOSE_DIR"

OLD="$(cat "$SECRETS/jwt_secret.txt")"
NEW="$(openssl rand -hex 32)"

# Stage the old secret as "previous" before overwriting the file it came
# from — the API verifies against the previous while it stands.
cp "$SECRETS/jwt_secret.txt" "$SECRETS/jwt_secret_prev.txt"
ln -sf "jwt_secret_prev.txt" "$SECRETS/jwt_secret_prev"
chmod 600 "$SECRETS/jwt_secret_prev.txt"

printf '%s' "$NEW" > "$SECRETS/jwt_secret.txt"
chmod 600 "$SECRETS/jwt_secret.txt"

echo "Rotated the JWT secret. The old key stays valid as the previous for the grace window."
echo "Restarting the API so it signs with the new key…"
if docker compose restart api >/dev/null 2>&1; then
  echo "The API is back up. New sessions sign with the new key; existing tokens still verify."
else
  echo "WARNING: 'docker compose restart api' did not succeed — check the install and restart by hand." >&2
  exit 1
fi

echo
echo "After the refresh-token window (7 days) the old key is worthless. To close the window now:"
echo "  rm -f '$SECRETS/jwt_secret_prev.txt' '$SECRETS/jwt_secret_prev' && docker compose restart api"
echo "Until then, anyone who still holds the old key's file can mint valid tokens — keep it as locked as the new one."
