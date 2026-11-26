import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectHealthChecker, ServiceHealth } from '../types';

/**
 * The project's domains, read from the reconciliation engine's own verdict.
 *
 * The domains module runs a live DNS/TLS/routing/email pipeline and records
 * its verdict on each domain (`healthStatus`, `lastHealthScore`) plus a
 * full history (`DomainHealthCheck`). Reading it here is the point: a DNS
 * record existing in the database is not the same as DNS answering, and a
 * certificate row is not the same as a certificate that validates. This
 * checker does no new checking — it just reports what the engine measured.
 */
@Injectable()
export class DomainsHealthChecker implements ProjectHealthChecker {
  readonly service = 'domains' as const;
  readonly link = '/domains';

  constructor(private prisma: PrismaService) {}

  async check(project: Project): Promise<ServiceHealth> {
    const domains = await this.prisma.domain.findMany({
      where: { projectId: project.id },
      select: {
        domain: true,
        healthStatus: true,
        lastHealthScore: true,
        lastVerifiedAt: true,
      },
    });
    if (domains.length === 0) {
      return this.base('not_configured', 'The project has no domains.');
    }

    // A broken domain drags the whole set down; the worst one is named so
    // the operator knows which to open.
    const rank = (s: string) =>
      s === 'FAILED' ? 3 : s === 'DEGRADED' ? 2 : s === 'PENDING' ? 1 : s === 'HEALTHY' ? 0 : 1;
    let worst = domains[0];
    for (const d of domains.slice(1)) {
      if (rank(d.healthStatus) > rank(worst.healthStatus)) worst = d;
    }

    const named = domains.length > 1 ? ` (${worst.domain})` : '';
    switch (worst.healthStatus) {
      case 'HEALTHY':
        return this.base('healthy', undefined, {
          lastGoodAt: worst.lastVerifiedAt ?? new Date(),
        });
      case 'DEGRADED':
        return this.base(
          'degraded',
          `A domain${named} is passing with checks failing (score ${worst.lastHealthScore ?? '—'}).`,
          { lastGoodAt: worst.lastVerifiedAt },
        );
      case 'FAILED':
        return this.base('unhealthy', `A domain${named} is failing its checks.`, {
          lastGoodAt: worst.lastVerifiedAt,
          lastFailureAt: new Date(),
        });
      case 'PENDING':
      default:
        // Never verified yet: the answer is genuinely not knowable.
        return this.base('unknown', `A domain${named} has not been verified yet.`);
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
