# syntax=docker/dockerfile:1
#
# FIDScript Deploy — Dashboard (Next.js, standalone output)
# Build context MUST be the monorepo root:
#   docker build -f apps/dashboard/Dockerfile -t fidscript-dashboard .
#
# Multi-stage: installs + `next build` (output: 'standalone'), then a slim
# non-root runtime running the standalone server.

FROM node:20-bookworm-slim AS build
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

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/dashboard/server.js"]
