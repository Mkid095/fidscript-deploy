import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DbPoolService } from '@/modules/databases/services/db-pool.service';
import { ProjectHealthChecker, ServiceHealth, unknownHealth, withTimeout } from '../types';

/**
 * The project's own PostgreSQL, against a live `SELECT 1` on its own
 * credentials — not the admin pool, not the platform database.
 *
 * The record says `ready`; the pool says whether it is actually answering.
 * The two can diverge: the instance was stopped, the disk filled, the
 * credentials rotated. The probe is the check.
 */
@Injectable()
export class DatabaseHealthChecker implements ProjectHealthChecker {
  readonly service = 'database' as const;
  readonly link = '/databases';

  constructor(
    private prisma: PrismaService,
    private pools: DbPoolService,
  ) {}

  async check(project: Project): Promise<ServiceHealth> {
    const db = await this.prisma.managedDatabase.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!db) {
      return this.base('not_configured', 'The project has no database.');
    }

    if (db.status === 'provisioning') {
      return this.base('unknown', 'The database is still being provisioned.');
    }
    if (db.status === 'failed') {
      return this.base('unhealthy', 'The database failed to provision.', {
        lastFailureAt: db.updatedAt,
      });
    }

    // `ready` (or any other status that reached this point): ask it.
    let ok: boolean;
    try {
      ok = await withTimeout(this.pools.healthCheck(db.id), 4000, 'database health check');
    } catch {
      // The probe itself could not run — a pool that will not open is a
      // service failure, not an infrastructure one, but an errored probe
      // call is unknown.
      return unknownHealth(this, 'The database could not be reached for a health check.');
    }
    if (!ok) {
      return this.base('unhealthy', 'The database is not accepting connections.', {
        lastGoodAt: db.updatedAt,
        lastFailureAt: new Date(),
      });
    }
    return this.base('healthy', undefined, { lastGoodAt: db.updatedAt });
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
