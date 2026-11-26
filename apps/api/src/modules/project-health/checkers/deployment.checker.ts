import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { deploymentContainerName } from '@/modules/deployments/runner/container-name';
import {
  ProjectHealthChecker,
  ServiceHealth,
  unknownHealth,
  withTimeout,
} from '../types';

/**
 * The deployment, against Docker's own word.
 *
 * The record says SUCCESS, but a container can have crashed, been GC'd, or
 * never come up. The newest deployment is the live one; its name is what
 * Traefik and the operator both reason about, so asking Docker about it is
 * asking the source of truth.
 */
@Injectable()
export class DeploymentHealthChecker implements ProjectHealthChecker {
  readonly service = 'deployment' as const;
  readonly link = '/deployments';

  constructor(private prisma: PrismaService) {}

  async check(project: Project): Promise<ServiceHealth> {
    if (!project.deploymentOn) {
      return this.base('not_configured', 'Deployments are switched off for this project.');
    }

    // The newest deployment, whatever its status, is the live one.
    const latest = await this.prisma.deployment.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      include: { release: true },
    });
    if (!latest) {
      return this.base('not_configured', 'No deployment has run yet.');
    }

    // In flight: the answer is not knowable until the build finishes.
    if (['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING', 'BLOCKED'].includes(latest.status)) {
      return this.base('unknown', 'A deployment is in progress; its state is not final yet.');
    }

    // The operator stopped it: a valid desired state, not a failure.
    if (latest.status === 'STOPPED') {
      return this.base(
        'degraded',
        'Stopped by the operator — the site is not serving until it is started again.',
        { lastGoodAt: latest.completedAt ?? latest.createdAt },
      );
    }

    if (latest.status === 'FAILED') {
      return this.base(
        'unhealthy',
        'The last deployment failed.',
        { lastFailureAt: latest.completedAt ?? latest.createdAt },
      );
    }

    // SUCCESS (or a rollback's SUCCESS): the container is the truth.
    const container = deploymentContainerName(project.slug, latest.id);
    const status = await this.containerStatus(container);
    if (status === null) {
      // Docker itself could not be asked: a probe failure, not a service failure.
      return unknownHealth(this, 'The container could not be inspected.');
    }
    if (status === 'missing') {
      return this.base(
        'unhealthy',
        'The live deployment no longer has a running container.',
        { lastGoodAt: latest.completedAt ?? latest.createdAt },
      );
    }
    if (status !== 'running') {
      return this.base('unhealthy', `The deployment's container is ${status}.`, {
        lastGoodAt: latest.completedAt ?? latest.createdAt,
      });
    }
    return this.base('healthy', undefined, {
      lastGoodAt: latest.completedAt ?? latest.createdAt,
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

  /**
   * `running` | `exited` | … | `missing` | `null` (Docker itself failed).
   * Bounded so a wedged daemon cannot hold the report open. Docker's exit
   * code is 1 for both "no such object" and "cannot reach the daemon", so
   * the stderr line — not the code — is the discriminator.
   */
  private async containerStatus(containerName: string): Promise<string | null> {
    try {
      const out = await withTimeout(
        Promise.resolve(
          execSync(`docker inspect -f '{{.State.Status}}' ${containerName}`, {
            timeout: 5000,
            stdio: 'pipe',
          })
            .toString()
            .trim(),
        ),
        5000,
        'docker inspect',
      );
      return out;
    } catch (err) {
      const e = err as { stderr?: Buffer | string; message?: string };
      const stderr = (e.stderr?.toString?.() ?? e.message ?? '');
      if (/no such object|no such container/i.test(stderr)) return 'missing';
      return null; // the daemon or the CLI itself failed to answer
    }
  }
}
