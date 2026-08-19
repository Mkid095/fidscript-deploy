# syntax=docker/dockerfile:1
#
# FIDScript Deploy — API (NestJS)
# Build context MUST be the monorepo root:
#   docker build -f apps/api/Dockerfile -t fidscript-api .
#
# Architecture:
#   build stage  — pnpm install, prisma generate, tsc, pnpm deploy
#   runtime stage — self-contained deployment from pnpm deploy output
#
# Why pnpm deploy?
#   The monorepo uses pnpm workspaces with workspace:* dependencies.
#   Copying the build-stage node_modules (pnpm symlinks) to a runtime stage
#   breaks relative symlinks for private-hoisted packages (@nestjs/*).
#   pnpm deploy creates a flat, self-contained tree with all packages at
#   top-level — no pnpm symlinks, no relative path breakage.

FROM node:20-bookworm-slim AS build
RUN apt-get update -y && apt-get install -y openssl libssl-dev curl git
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Layer 1: manifests (cached longest)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json ./apps/api/

# Layer 2: workspace packages source
COPY packages/ ./packages/

# Layer 3: API source, schema, and TypeScript config
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/prisma/ ./apps/api/prisma/
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./

# Layer 4: install dependencies
RUN pnpm install --frozen-lockfile

# Layer 5: generate Prisma Client
RUN cd apps/api && pnpm exec prisma generate

# Layer 6: compile TypeScript + resolve @/ path aliases
RUN pnpm exec tsc -p apps/api/tsconfig.json
RUN cd apps/api && pnpm exec tsc-alias -p tsconfig.json

# Layer 7: compile the seed script (plain JS, no decorators)
RUN cd apps/api && pnpm exec tsc -p tsconfig.json --outDir . prisma/seed.ts 2>/dev/null || \
    cp prisma/seed.ts prisma/seed.js

# Layer 8: create self-contained production deployment
# pnpm deploy produces /app/deploy with a flat node_modules/ (no relative symlinks)
RUN cd /app && pnpm deploy --filter @fidscript/api --prod /app/deploy

FROM node:20-bookworm-slim AS runtime

# Install Docker CLI for deployment worker (docker build, buildx via docker.sock)
RUN apt-get update -y && apt-get install -y ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update -y && apt-get install -y openssl curl docker-ce-cli docker-buildx-plugin && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Prisma CLI globally — used at container startup for migrate + db seed + generate.
RUN npm install -g prisma@5.22.0

WORKDIR /app

# Copy the self-contained deployment produced by pnpm deploy
COPY --from=build /app/deploy/ ./

# Generate Prisma Client runtime artifacts in the deployment directory.
# pnpm deploy copies @prisma/client as a stub (no .prisma/client/ inside), but
# the compiled app imports Role from '@prisma/client'. Running 'prisma generate'
# here (after the schema is copied) writes the real .prisma/client/ to
# /app/node_modules/@prisma/client/ — replacing the stub with a working copy.
RUN prisma generate --schema=prisma/schema.prisma

# Copy entrypoint from installer (DO NOT copy entire installer directory)
COPY installer/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
