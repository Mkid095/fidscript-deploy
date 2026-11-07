# syntax=docker/dockerfile:1
#
# The FIDScript console — the one Next.js app that serves the platform.
#
#   docker build -t fidscript-console .
#
# Architecture:
#   build stage   — install, then build the standalone output
#   runtime stage — only what the server needs to run
#
# NEXT_PUBLIC_API_URL is BAKED INTO THE BUNDLE at build time, so it is an
# ARG: the console's server reads the API's address from it, and the
# browser's calls go through the console's own proxy at /api/v1.

FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl libssl-dev curl git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# The manifests first: they change least, so the install layer is kept.
COPY package.json package-lock.json ./
RUN npm ci

# Then the source.
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
# The build is the memory-hungry step on a small machine. The heap is
# capped so it fails loudly instead of inviting the OOM killer to take out
# the services running beside it.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app

# The standalone output keeps the server entrypoint at the root.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "server.js"]
