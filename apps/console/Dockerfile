# syntax=docker/dockerfile:1
#
# The FIDScript console — the one Next.js app that serves the platform.
#
#   docker build -f apps/console/Dockerfile -t fidscript-console .
#
# Architecture:
#   build stage   — install the workspace, then build the standalone output
#   runtime stage — only what the server needs to run
#
# NEXT_PUBLIC_API_URL is BAKED INTO THE BUNDLE at build time, so it is an
# ARG: the console's server reads the API's address from it, and the
# browser's calls go through the console's own proxy at /console/api/v1.

FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl libssl-dev curl git \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Layer 1: the manifests. The workspace's lockfile covers every package, so
# this is what makes the install cacheable.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps/console/package.json ./apps/console/
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/events/package.json ./packages/events/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/

# Only the console's own dependencies, and none of the workspace's lifecycle
# scripts: the console does not need the API's tree, and the API's
# postinstall wants a schema this image does not carry. The scripts the
# console's own dependencies have are not needed to build it either.
RUN pnpm install --no-frozen-lockfile --filter @fidscript/console... --ignore-scripts

# Layer 2: the source.
COPY scripts/ ./scripts/
COPY packages/ ./packages/
COPY apps/console/ ./apps/console/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
# The build is the memory-hungry step on a small machine. The heap is
# capped so it fails loudly instead of inviting the OOM killer to take out
# the services running beside it.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm --filter @fidscript/console build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app

# The standalone output keeps the workspace's layout, so the server's
# entrypoint is at apps/console/server.js.
COPY --from=build /app/apps/console/.next/standalone ./
COPY --from=build /app/apps/console/.next/static ./apps/console/.next/static
COPY --from=build /app/apps/console/public ./apps/console/public

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/console/server.js"]
