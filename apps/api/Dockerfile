# syntax=docker/dockerfile:1
#
# FIDScript Deploy — API (NestJS)
# Build context MUST be the monorepo root:
#   docker build -f apps/api/Dockerfile -t fidscript-api .
#
# Multi-stage: installs + prisma generate + nest build, then a slim non-root
# runtime carrying only dist + prisma + node_modules.

FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Whole repo (node_modules/dist/.next excluded via .dockerignore); frozen lockfile
# keeps the workspace install reproducible.
COPY . .
RUN pnpm install --frozen-lockfile
# turbo respects dependsOn: ["^build"] — builds all dependencies first, then the API
RUN pnpm --filter @fidscript/api exec prisma generate
RUN npx turbo build --filter=@fidscript/api

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Prisma's native engine binaries (libquery-engine, schema-engine) link against
# OpenSSL. The slim base image doesn't ship libssl, so without this install
# the engine fails to initialize and `prisma migrate deploy` reports a
# blank "Error: Schema engine error:" with no further detail. curl is
# also installed for the runtime healthcheck (compose's "test" command)
# and for the api's Stalwart JMAP connectivity probe (see
# email/stalwart/stalwart-core.service.ts). git lets the deployment worker
# clone user source repos. docker-ce-cli + docker-buildx-plugin let the
# deployment worker run `docker build`/`docker run` against the host daemon
# (socket mounted in docker-compose); buildx is required because the worker
# sets DOCKER_BUILDKIT=1 and uses `--secret` (a BuildKit feature). Only the
# CLI + plugin are installed (no daemon), from Docker's
# official apt repo since Debian's default repos don't carry it. The host
# docker socket's group GID is granted to the non-root `node` user at
# runtime via compose `group_add` (DOCKER_GID). Install as root (before
# USER node) and clean the apt cache.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl git gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update -y \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-buildx-plugin \
    && rm -rf /var/lib/apt/lists/*

# pnpm's node_modules (root + per-package) carry the resolved dependency graph;
# packages/ holds the built @fidscript/* workspace libs the API requires.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
# Remove the no-op installation_lifecycle_failed migration — its objects were
# created manually via SQL. Keeping the dir causes Prisma to detect a "failed
# migration" marker and block all subsequent migrate deploy runs.
RUN rm -rf ./apps/api/prisma/migrations/20260622000000_installation_lifecycle_failed
COPY apps/api/package.json ./apps/api/package.json

# Entrypoint reads *_FILE env vars, runs migrations, then starts the API.
# Copy from monorepo root (build context) so the script is available.
COPY --from=build /app/installer/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chown -R node:node /app && chmod +x /usr/local/bin/api-entrypoint.sh
USER node

EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
