import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectHealthChecker, ServiceHealth } from '../types';

/**
 * The project's functions: are they deployed, and did the newest one
 * actually run?
 *
 * A function row that says `created` has never been deployed — it exists,
 * but there is nothing to invoke. And a deployed function whose latest log
 * is an error is serving broken code. Both are degraded, not failed: the
 * runtime is up, the content is not.
 */
@Injectable()
export class FunctionsHealthChecker implements ProjectHealthChecker {
  readonly service = 'functions' as const;
  readonly link = '/functions';

  constructor(private prisma: PrismaService) {}

  async check(project: Project): Promise<ServiceHealth> {
    const fns = await this.prisma.function.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, status: true, updatedAt: true },
    });
    if (fns.length === 0) {
      return this.base('not_configured', 'The project has no functions.');
    }

    const notDeployed = fns.filter((f) => f.status !== 'deployed');
    const lastLog = await this.prisma.functionLog.findFirst({
      where: { functionId: { in: fns.map((f) => f.id) } },
      orderBy: { createdAt: 'desc' },
      select: { status: true, errorMessage: true, createdAt: true },
    });

    if (lastLog?.status === 'error') {
      const detail = lastLog.errorMessage
        ? ` (${lastLog.errorMessage.slice(0, 160)})`
        : '';
      return this.base('degraded', `The most recent function invocation failed${detail}.`, {
        lastFailureAt: lastLog.createdAt,
      });
    }
    if (notDeployed.length > 0) {
      const named = notDeployed.length === 1 ? notDeployed[0].name : `${notDeployed.length} functions`;
      return this.base('degraded', `${named} has not been deployed yet.`);
    }
    return this.base('healthy', undefined, {
      lastGoodAt: lastLog?.createdAt ?? fns[fns.length - 1].updatedAt,
    });
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
