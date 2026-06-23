# syntax=docker/dockerfile:1
#
# FIDScript Deploy — Dashboard (Next.js, standalone output)
# Build context MUST be the monorepo root.
# Required build args (set at install time by docker-compose):
#   NEXT_PUBLIC_PLATFORM_DOMAIN  — e.g. deploy.fidscript.com
#   NEXT_PUBLIC_API_URL          — e.g. https://deploy.fidscript.com/api
# These are baked into the JS bundle at build time. There is no hardcoded
# default — running without them is a build configuration error.
#
# Example:
#   docker build \
#     --build-arg NEXT_PUBLIC_PLATFORM_DOMAIN=deploy.fidscript.com \
#     --build-arg NEXT_PUBLIC_API_URL=https://deploy.fidscript.com/api \
#     -f apps/dashboard/Dockerfile -t docker-dashboard .
#
# Multi-stage: installs + `next build` (output: 'standalone'), then a slim
# non-root runtime running the standalone server.

FROM node:20-bookworm-slim AS build
ARG NEXT_PUBLIC_PLATFORM_DOMAIN
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PLATFORM_DOMAIN=${NEXT_PUBLIC_PLATFORM_DOMAIN}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
# turbo respects dependsOn:["^build"] — builds @fidscript/ui, @fidscript/sdk and
# @fidscript/types (their dist/) BEFORE the dashboard, so `next build` can
# resolve them. A bare `pnpm --filter ... build` skips deps and fails with
# "Module not found: Can't resolve '@fidscript/sdk'" in a clean build context.
RUN npx turbo build --filter=@fidscript/dashboard

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone bundles a minimal node_modules + server.js mirroring the monorepo
# layout (apps/dashboard/server.js). Static assets are copied alongside so the
# server can serve them from ./apps/dashboard/.next/static.
COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
# Server pages (compiled app routes) — needed for Next.js App Router
COPY --from=build /app/apps/dashboard/.next/server ./apps/dashboard/.next/server

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/dashboard/server.js"]
