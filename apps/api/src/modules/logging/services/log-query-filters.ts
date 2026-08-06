import { PrismaService } from '@/prisma/prisma.service';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse a CSV level string into an array. Returns undefined when no level
 * filter is supplied. Returns a single string when only one level is present
 * so callers that pass one level keep working unchanged.
 */
export function parseLevels(level?: string): string | string[] | undefined {
  if (!level) return undefined;
  const parts = level.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return parts;
}

/**
 * Resolve a stream filter to a streamId. Accepts either a stream UUID or
 * a stream name (e.g. "default", "build"); looks up the name within the
 * project scope when needed. Returns null when no stream filter is set.
 */
export async function resolveStreamId(
  prisma: PrismaService,
  projectId: string,
  stream?: string,
): Promise<string | null> {
  if (!stream) return null;
  if (UUID_RE.test(stream)) return stream;
  const row = await prisma.logStream.findUnique({
    where: { projectId_name: { projectId, name: stream } },
    select: { id: true },
  });
  return row?.id ?? null;
}
