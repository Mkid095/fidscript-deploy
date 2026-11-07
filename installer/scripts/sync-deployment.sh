#!/usr/bin/env bash
#
# Sync the repository into the deployment directory.
#
# The deployment directory is a **copy** of the repository, not a checkout:
# the platform's own files live there — the environment file, the secrets,
# the edge's dynamic routes — and they are never touched by a sync.
#
# The copy is made with `--delete`, so a file that was deleted from the
# repository does not stay behind in the deployment and end up in the next
# image. A stale copy of a deleted file is not a harmless leftover: the
# dashboard's build failed on one (a file that imported a type the
# repository had removed).
#
# Usage: installer/scripts/sync-deployment.sh [target]
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${1:-/opt/fidscript-deploy}"

if [ ! -d "${TARGET}" ]; then
  echo "The deployment directory ${TARGET} does not exist." >&2
  exit 1
fi

rsync -a --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='dist/' \
  --exclude='backups/' \
  --exclude='coverage/' \
  --exclude='.turbo/' \
  --exclude='.playwright-cli/' \
  --exclude='*.tsbuildinfo' \
  --exclude='*.log' \
  --exclude='installer/docker/secrets/' \
  --exclude='installer/docker/traefik/' \
  --exclude='installer/docker/.env' \
  "${REPO_DIR}/" "${TARGET}/"

echo "→ ${TARGET} is in step with the repository"
