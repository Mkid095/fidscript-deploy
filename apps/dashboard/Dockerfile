# syntax=docker/dockerfile:1
#
# FIDScript Deploy — Dashboard (Next.js, standalone output)
# Build context MUST be the monorepo root at /home/ken/fidscript-deploy.
#
# Build strategy: `next build` runs LOCALLY first (outside Docker) with
# NODE_OPTIONS='--max-old-space-size=4096' to avoid in-container OOM.
# This Dockerfile is SINGLE-STAGE — it only copies the pre-built output.
# No pnpm install, no next build inside Docker.
#
# Required env at build time (for reference — values are baked into the JS bundle
# at local build time, so these don't functionally change the output):
#   NEXT_PUBLIC_PLATFORM_DOMAIN  — e.g. deploy.fidscript.com
#   NEXT_PUBLIC_API_URL         — e.g. https://deploy.fidscript.com/api
#
# Runtime env (passed by compose, control how the Node server starts):
#   PORT=3001, HOSTNAME=0.0.0.0 — baked into standalone server.js

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app

# Copy pre-built standalone output directly from the build context (monorepo).
# The standalone/ directory and .next/ tree are produced by `next build` running
# locally on the host before this docker build runs.
COPY apps/dashboard/.next/standalone ./
COPY apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY apps/dashboard/.next/server ./apps/dashboard/.next/server
COPY apps/dashboard/public ./apps/dashboard/public

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/dashboard/server.js"]
