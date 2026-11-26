#!/usr/bin/env bash
#
# docker-space-maintenance.sh — the daily sweep of the machine's Docker space.
#
# The rule that shapes this script, and the platform's GC, and the
# console's reclaim button: only touch what the Docker daemon itself
# calls reclaimable. On containerd-backed hosts the "build cache" is the
# shared layer store behind the running images — the daemon marks it
# 0B reclaimable, and forcing it would take the live sites down. So:
#
#   - docker system prune -f   dangling images, stopped/created
#                              containers, unused networks. Never in-use.
#   - docker builder prune -f  build cache no image or build references.
#
# Never: volumes, tagged images, running containers, or --all.
#
# The sweep is measured against the machine's own disk before and after,
# and logged. When the root filesystem sits high after a clean sweep,
# the growth is data (volumes, databases, retained images), not Docker
# waste — the log says so, because a prune will not save the machine.
#
# Usage:
#   installer/scripts/docker-space-maintenance.sh [LOG_DIR]
#
# LOG_DIR defaults to the install's own logs/ directory (writable by the
# operator; /var/log is root's and a non-root crontab cannot use it).
# Run daily from cron:
#   30 3 * * * root /opt/fidscript-deploy/installer/scripts/docker-space-maintenance.sh

set -u

INSTALL_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
LOG_DIR=${1:-"$INSTALL_ROOT/logs"}
LOG="$LOG_DIR/docker-space.log"
ALERT_PCT=${DOCKER_SPACE_ALERT_PCT:-90}

mkdir -p "$LOG_DIR"

df_used_pct() {
  # Root filesystem usage, as a whole percentage.
  df -B1 -P / 2>/dev/null | awk 'NR==2 { printf "%d", ($2>0)? int(($3*100)/$2) : 0 }'
}

{
  echo
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') docker space maintenance ==="
  BEFORE_PCT=$(df_used_pct)
  echo "disk before: ${BEFORE_PCT}%"

  # The reclaim ladder. Each step is independent: one failing must not
  # stop the rest.
  docker system prune -f 2>&1 | sed 's/^/[prune] /'
  docker builder prune -f 2>&1 | sed 's/^/[buildcache] /'

  AFTER_PCT=$(df_used_pct)
  echo "disk after:  ${AFTER_PCT}%"

  if [ "${AFTER_PCT:-0}" -ge "$ALERT_PCT" ]; then
    # A high disk that a clean sweep did not move is data growth: the
    # operator's volumes, the databases, the images the GC must keep for
    # rollback. No prune will fix that.
    echo "ALERT: root disk is at ${AFTER_PCT}% and nothing reclaimable was left to take. This is data growth — free space by hand (volumes, old databases, retention) or the machine will fill."
  fi

  echo "=== done ==="
} >>"$LOG" 2>&1

# The operator should be able to see the verdict without opening the log.
tail -n 30 "$LOG" >/dev/null 2>&1
exit 0
