import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { DeploymentHealthChecker } from './checkers/deployment.checker';
import { DatabaseHealthChecker } from './checkers/database.checker';
import { InstantDbHealthChecker } from './checkers/instantdb.checker';
import { DomainsHealthChecker } from './checkers/domains.checker';
import { EmailHealthChecker } from './checkers/email.checker';
import { CronHealthChecker } from './checkers/cron.checker';
import { FunctionsHealthChecker } from './checkers/functions.checker';
import { StorageHealthChecker } from './checkers/storage.checker';
import { ProjectHealthChecker, ProjectHealthReport, rollUp, unknownHealth, withTimeout } from './types';

/**
 * One truthful, read-only answer per project: is each service actually
 * working, or only its record?
 *
 * Rules this service enforces:
 * - a checker that fails or times out is `unknown`, never `healthy`;
 * - an unconfigured optional service is `not_configured`, never `unhealthy`;
 * - the whole report is cached for 60s so a page load does not re-probe
 *   Docker, the databases, the mail service or MinIO;
 * - nothing here restarts, mutates or provisions a service. It only reads.
 */
@Injectable()
export class ProjectHealthService {
  private readonly logger = new Logger(ProjectHealthService.name);
  private readonly checkers: ProjectHealthChecker[];

  /** Per-checker cap. The inner probes already bound themselves; this is
   *  the backstop for a wedged database read. */
  private static readonly CHECKER_MS = 6000;
  /** How long a finished report stays warm. */
  private static readonly CACHE_TTL_S = 60;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    deployment: DeploymentHealthChecker,
    database: DatabaseHealthChecker,
    instantdb: InstantDbHealthChecker,
    domains: DomainsHealthChecker,
    email: EmailHealthChecker,
    cron: CronHealthChecker,
    functions: FunctionsHealthChecker,
    storage: StorageHealthChecker,
  ) {
    this.checkers = [deployment, database, instantdb, domains, email, cron, functions, storage];
  }

  /**
   * The project's health. `force` bypasses the cache — the console's
   * "recheck" button, or any caller that wants the fresh answer.
   */
  async evaluate(projectId: string, options?: { force?: boolean }): Promise<ProjectHealthReport> {
    const cacheKey = `project-health:${projectId}`;
    if (!options?.force) {
      const cached = await this.redis.get<ProjectHealthReport>(cacheKey);
      if (cached && Array.isArray(cached.services) && cached.services.length === this.checkers.length) {
        return cached;
      }
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const services = await Promise.all(
      this.checkers.map(async (checker) => this.run(checker, project)),
    );

    const report: ProjectHealthReport = {
      projectId,
      checkedAt: new Date().toISOString(),
      overall: rollUp(services),
      services,
    };
    // Cache even a report that contains `unknown`s: it is honest for 60s,
    // and the next call re-probes everything.
    await this.redis.set(cacheKey, report, ProjectHealthService.CACHE_TTL_S);
    return report;
  }

  /**
   * One checker, bounded. A checker that rejects or times out yields
   * `unknown` with a reason — the report stays truthful and the page stays
   * fast. Nothing here ever turns a failure into a healthy state.
   */
  private async run(checker: ProjectHealthChecker, project: Project) {
    try {
      return await withTimeout(checker.check(project), ProjectHealthService.CHECKER_MS, `health check: ${checker.service}`);
    } catch (err) {
      this.logger.warn(`Health check "${checker.service}" for project ${project.id} did not finish: ${(err as Error).message}`);
      return unknownHealth(checker, 'The check did not finish in time.');
    }
  }
}
