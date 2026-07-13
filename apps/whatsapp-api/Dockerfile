FROM node:24-alpine AS builder

RUN apk update && \
    apk add --no-cache git ffmpeg wget curl bash openssl dos2unix

LABEL version="1.0.0" description="Next Mavens Fidscript WhatsApp API - Enterprise WhatsApp Business API Platform"
LABEL maintainer="Next Mavens" git="https://github.com/NextMavens/fidscript-whatsapp-api"
LABEL contact="info@nextmavens.com"

WORKDIR /fidscript

COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./tsup.config.ts ./

RUN npm ci --silent

COPY ./src ./src
COPY ./public ./public
COPY ./prisma ./prisma
COPY ./manager ./manager
COPY ./.env.example ./.env
COPY ./runWithProvider.js ./

COPY ./Docker ./Docker

RUN chmod +x ./Docker/scripts/* && dos2unix ./Docker/scripts/*

RUN ./Docker/scripts/generate_database.sh

RUN npm run build

FROM node:24-alpine AS final

RUN apk update && \
    apk add tzdata ffmpeg bash openssl

ENV TZ=UTC
ENV DOCKER_ENV=true

WORKDIR /fidscript

COPY --from=builder /fidscript/package.json ./package.json
COPY --from=builder /fidscript/package-lock.json ./package-lock.json

COPY --from=builder /fidscript/node_modules ./node_modules
COPY --from=builder /fidscript/dist ./dist
COPY --from=builder /fidscript/prisma ./prisma
COPY --from=builder /fidscript/manager ./manager
COPY --from=builder /fidscript/public ./public
COPY --from=builder /fidscript/.env ./.env
COPY --from=builder /fidscript/Docker ./Docker
COPY --from=builder /fidscript/runWithProvider.js ./runWithProvider.js
COPY --from=builder /fidscript/tsup.config.ts ./tsup.config.ts

ENV DOCKER_ENV=true

EXPOSE 8080

ENTRYPOINT ["/bin/bash", "-c", ". ./Docker/scripts/deploy_database.sh && npm run start:prod" ]
