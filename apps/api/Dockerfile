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
RUN pnpm --filter @fidscript/api exec prisma generate
RUN pnpm --filter @fidscript/api build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# pnpm's node_modules (root + per-package) carry the resolved dependency graph;
# packages/ holds the built @fidscript/* workspace libs the API requires.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json ./apps/api/package.json

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
