# syntax=docker/dockerfile:1
#
# FIDScript Deploy — Dashboard (Next.js, standalone output)
# Build context MUST be the monorepo root:
#   docker build -f apps/dashboard/Dockerfile -t fidscript-dashboard .
#
# Architecture:
#   build stage  — pnpm install, turbo build (workspace deps + next build)
#   runtime stage — copies only the standalone output
#
# This used to be a single-stage image that copied a PRE-BUILT .next/
# directory, which meant `docker compose up --build` could never build the
# dashboard from a fresh clone — there was no .next/ on a new machine, and
# the build failed with a missing-source error. The build now happens
# inside the image, so a fresh VPS can install from a clone with nothing
# but Docker.
#
# NEXT_PUBLIC_* vars are BAKED INTO THE CLIENT BUNDLE at build time, so
# they are passed as build args and re-exported as ENV for the build step:
#   NEXT_PUBLIC_PLATFORM_DOMAIN  — e.g. deploy.fidscript.com
#   NEXT_PUBLIC_API_URL         — e.g. https://api.deploy.fidscript.com

FROM node:20-bookworm-slim AS build
RUN apt-get update -y && apt-get install -y openssl libssl-dev curl git \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Layer 1: manifests (cached longest)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc* ./
COPY apps/dashboard/package.json ./apps/dashboard/

# Layer 2: workspace packages source (@fidscript-deploy/ui, /sdk, /events, /types)
COPY packages/ ./packages/

# Layer 3: install dependencies
# --no-frozen-lockfile, not --frozen-lockfile: the image contains only the
# dashboard and packages/ importers, which is a subset of the lockfile's
# importers, so a frozen check would reject it. This mirrors the API image.
RUN pnpm install --no-frozen-lockfile

# Layer 4: the dashboard's own source. Copied after the install so that
# editing application code does not invalidate the dependency layer.
# tsconfig.base.json (above) is required — the workspace packages extend
# it, and without it their builds fail with "Cannot read file".
COPY apps/dashboard/next.config.mjs \
     apps/dashboard/tsconfig.json \
     apps/dashboard/postcss.config.mjs \
     apps/dashboard/next-env.d.ts \
     ./apps/dashboard/
COPY apps/dashboard/src/ ./apps/dashboard/src/
COPY apps/dashboard/public/ ./apps/dashboard/public/

# Layer 5: build the workspace packages the dashboard depends on, then the
# dashboard itself. turbo resolves the order (@fidscript-deploy/types →
# events → sdk, and ui) via the workspace graph, so the packages' dist/
# entry points exist before next build resolves them.
ARG NEXT_PUBLIC_PLATFORM_DOMAIN
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PLATFORM_DOMAIN=$NEXT_PUBLIC_PLATFORM_DOMAIN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
# next build is the memory-hungry step of the install. The heap is capped
# so the build fails loudly instead of inviting the OOM killer to take out
# neighbouring containers on a small VPS. NEXT_BUILD_MEMORY is what the
# package's build script reads; it defaults to 4096 on the host.
ENV NEXT_BUILD_MEMORY=2048
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm exec turbo build --filter=@fidscript/dashboard

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app

# Copy pre-built standalone output from the build stage.
# The standalone/ directory keeps the monorepo layout, so the server
# entrypoint is at apps/dashboard/server.js.
COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build /app/apps/dashboard/.next/server ./apps/dashboard/.next/server
COPY --from=build /app/apps/dashboard/public ./apps/dashboard/public

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/dashboard/server.js"]
