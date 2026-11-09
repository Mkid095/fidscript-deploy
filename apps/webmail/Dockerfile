# The webmail application.
#
# Build context is this folder (apps/webmail). The FIDScript deployment
# builds it the same way and just points the Stalwart env at the
# platform's internal address.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run db:generate && npm run build

FROM node:22-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
# The application database lives on this volume; the backup/restore story
# is the Stalwart volume plus this one.
VOLUME /data
ENV DATABASE_URL="file:/data/webmail.db"
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node node_modules/next/dist/bin/next start -p 3000"]
