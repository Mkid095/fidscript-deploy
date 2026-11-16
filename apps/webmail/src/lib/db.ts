import path from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * The application database (SQLite by default).
 *
 * A relative `file:` URL is normalised against the app root so the same
 * .env works in `next dev`, `next start`, and the container (all of which
 * run from the app root). The Prisma CLI resolves `file:` against the
 * schema directory, so its scripts want an absolute path — set
 * DATABASE_URL accordingly when running them.
 */
function resolvedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('file:./')) {
    return `file:${path.resolve(process.cwd(), url.slice('file:'.length))}`;
  }
  return url;
}

process.env.DATABASE_URL = resolvedDatabaseUrl() ?? '';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
