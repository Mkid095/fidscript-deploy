import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';
import { ProjectHealthChecker, ServiceHealth, unknownHealth, withTimeout } from '../types';

/**
 * Object storage: do the buckets exist, and does the storage backend
 * actually answer?
 *
 * The buckets in the database are the configuration; `MinioProvider
 * .testConnection()` — the same probe behind the storage connection test —
 * is the truth. It is shared across projects and short-lived: a fresh
 * probe at most once a minute.
 */
@Injectable()
export class StorageHealthChecker implements ProjectHealthChecker {
  readonly service = 'storage' as const;
  readonly link = '/settings';

  private probeCache: { at: number; ok: boolean; error?: string } | null = null;
  private static readonly PROBE_TTL_MS = 60_000;

  constructor(
    private prisma: PrismaService,
    private storage: MinioProvider,
  ) {}

  async check(project: Project): Promise<ServiceHealth> {
    const buckets = await this.prisma.bucket.findMany({
      where: { projectId: project.id },
      select: { provider: true },
    });
    if (buckets.length === 0) {
      return this.base('not_configured', 'The project has no storage buckets.');
    }

    const probe = await this.probe();
    if (probe === null) {
      // The probe itself could not run: the backend's state is not knowable.
      return unknownHealth(this, 'The storage service could not be probed.');
    }
    if (probe.ok) {
      return this.base('healthy', undefined, { lastGoodAt: new Date() });
    }
    if (/rejected|access key|secret/i.test(probe.error ?? '')) {
      return this.base('unhealthy', 'The storage credentials were rejected.', {
        lastFailureAt: new Date(),
      });
    }
    if (/reach|connect|refused|timed? ?out|ENOTFOUND/i.test(probe.error ?? '')) {
      return this.base('unhealthy', 'The storage service is not reachable.', {
        lastFailureAt: new Date(),
      });
    }
    return this.base('unhealthy', `The storage service is failing: ${(probe.error ?? 'unknown error').slice(0, 160)}`, {
      lastFailureAt: new Date(),
    });
  }

  /** Cached probe result, or `null` when the probe could not run at all. */
  private async probe(): Promise<{ ok: boolean; error?: string } | null> {
    if (this.probeCache && Date.now() - this.probeCache.at < StorageHealthChecker.PROBE_TTL_MS) {
      return this.probeCache;
    }
    try {
      const result = await withTimeout(this.storage.testConnection(), 5000, 'storage probe');
      this.probeCache = { at: Date.now(), ok: result.ok, error: result.error };
      return result;
    } catch {
      // A thrown probe is an infrastructure failure of the check itself.
      if (this.probeCache) return this.probeCache; // last known, honestly labelled
      return null;
    }
  }

  private base(
    state: ServiceHealth['state'],
    reason?: string,
    times?: { lastGoodAt?: Date | null; lastFailureAt?: Date | null },
  ): ServiceHealth {
    return {
      service: this.service,
      configured: state !== 'not_configured',
      state,
      reason,
      lastGoodAt: times?.lastGoodAt ? times.lastGoodAt.toISOString() : null,
      lastFailureAt: times?.lastFailureAt ? times.lastFailureAt.toISOString() : null,
      link: this.link,
    };
  }
}
