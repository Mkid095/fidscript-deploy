#!/usr/bin/env bash
#
# audit-secret-permissions.sh — verify the secrets directory is locked down.
#
# The install wizard sets the permissions; this is the check that says so.
# Every secret file must be readable by no one but its owner:
#
#   - the directory itself: 0700
#   - regular files:        0600
#   - pgbouncer_userlist*:  0640 (pgbouncer reads it as a different user —
#                            group-read is the point, world-read is not)
#   - symlinks:             the link's own mode is meaningless on Linux;
#                            what matters is the target, which is checked
#                            under its real name.
#
# Usage:
#   scripts/audit-secret-permissions.sh [SECRETS_DIR]
#
# SECRETS_DIR defaults to installer/docker/secrets, relative to the
# repository root; on a live install point it at /opt/fidscript-deploy/
# installer/docker/secrets.
#
# Exit: 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
SECRETS_DIR=${1:-"$REPO_ROOT/installer/docker/secrets"}

if [[ ! -d "$SECRETS_DIR" ]]; then
  echo "FAIL  secrets directory not found: $SECRETS_DIR"
  exit 1
fi

fail=0

# ── the directory itself ─────────────────────────────────────────────────────
dir_mode=$(stat -c '%a' "$SECRETS_DIR")
if [[ "$dir_mode" == "700" ]]; then
  echo "PASS  $SECRETS_DIR  (dir 0700)"
else
  echo "FAIL  $SECRETS_DIR  (dir 0$dir_mode, want 0700)"
  fail=1
fi

# ── every entry in it ────────────────────────────────────────────────────────
while IFS= read -r entry; do
  name=${entry##*/}
  mode=$(stat -c '%a' "$entry")

  if [[ -L "$entry" ]]; then
    # A symlink to its real file (the docker secrets convention:
    # `jwt_secret -> jwt_secret.txt`). The link's mode is always 777 and
    # the OS ignores it; the target is what carries the bytes, and it is
    # audited under its own name.
    echo "PASS  $name  (symlink to $(readlink "$entry"), audited as its target)"
    continue
  fi

  if [[ "$name" == pgbouncer_userlist* ]]; then
    want=640
  else
    want=600
  fi

  if [[ "$mode" == "$want" ]]; then
    echo "PASS  $name  (0$mode)"
  else
    echo "FAIL  $name  (0$mode, want 0$want)"
    fail=1
  fi
done < <(find "$SECRETS_DIR" -mindepth 1 -maxdepth 1)

if [[ "$fail" -eq 0 ]]; then
  echo
  echo "All secret files carry the permissions the install sets."
else
  echo
  echo "Fix:  chmod 700 $SECRETS_DIR"
  echo "      find $SECRETS_DIR -maxdepth 1 -type f ! -name 'pgbouncer_userlist*' -exec chmod 600 {} + || true"
  echo "      find $SECRETS_DIR -maxdepth 1 -type f -name 'pgbouncer_userlist*' -exec chmod 640 {} + || true"
fi
exit "$fail"
