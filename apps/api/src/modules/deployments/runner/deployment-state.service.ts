import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { BuildRunnerService } from './build-runner.service';
import { BuildProvider } from '../providers/build-provider.interface';

@Injectable()
export class DeploymentStateService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentStateService.name);

  constructor(
    private eventService: EventService,
    private prisma: PrismaService,
    private buildRunner: BuildRunnerService,
    private cryptoService: CryptoService,
    @Inject('BUILD_PROVIDER') private buildProvider: BuildProvider,
  ) {}

  onModuleInit() {
    this.eventService.on('deployments.deployment.created', this.handleDeploymentCreated.bind(this));
    // Fallback: re-process any PENDING deployments that were orphaned before a fix or
    // missed due to a handler error. Idempotent — runDeployment skips if not PENDING.
    this.recoverStuckDeployments().catch(err =>
      this.logger.warn(`[worker] Stuck deployment recovery failed: ${err.message}`),
    );
  }

  private async recoverStuckDeployments() {
    const stuck = await this.prisma.deployment.findMany({
      where: { status: 'PENDING' },
      select: { id: true, projectId: true },
    });
    if (!stuck.length) return;
    this.logger.log(`[worker] Recovering ${stuck.length} stuck PENDING deployment(s)`);
    await Promise.allSettled(
      stuck.map(d => this.runDeployment(d.id, d.projectId, '')),
    );
  }

  private async handleDeploymentCreated(event: any) {
    // The emit() call wraps the PlatformEvent in metadata, so the actual payload
    // (with deploymentId/projectId) lives at event.metadata.metadata
    const { deploymentId, projectId, userId } = event.metadata?.metadata || event.metadata || {};
    if (!deploymentId || !projectId) { this.logger.warn('[worker] Missing deploymentId/projectId'); return; }
    this.logger.log(`[worker] Processing deployment ${deploymentId}`);
    try {
      await this.runDeployment(deploymentId, projectId, userId as string || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[worker] Deployment ${deploymentId} threw: ${msg}`);
      await this.markFailed(deploymentId, projectId, msg);
    }
  }

  async runDeployment(deploymentId: string, projectId: string, userId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true, release: true },
    });
    if (!deployment) { this.logger.error(`[worker] Deployment ${deploymentId} not found`); return; }
    if (deployment.status !== 'PENDING') { this.logger.warn(`[worker] Deployment ${deploymentId} is ${deployment.status}, skipping`); return; }

    const settings = await this.prisma.projectSettings.findUnique({ where: { projectId } });
    if (settings?.activeDeploymentId) {
      const active = await this.prisma.deployment.findUnique({ where: { id: settings.activeDeploymentId } });
      if (active && ['QUEUED', 'BUILDING', 'DEPLOYING'].includes(active.status)) {
        await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'BLOCKED' } });
        await this.emit(deploymentId, projectId, userId, 'deployments.deployment.blocked', { blockedBy: settings.activeDeploymentId });
        return;
      }
    }

    await this.prisma.projectSettings.upsert({
      where: { projectId }, create: { projectId, activeDeploymentId: deploymentId }, update: { activeDeploymentId: deploymentId },
    });

    await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'QUEUED' } });
    await this.emit(deploymentId, projectId, userId, 'deployments.deployment.queued', {});
    await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'BUILDING' } });
    await this.emit(deploymentId, projectId, userId, 'deployments.deployment.building', {});

    const projectEnv = await this.prisma.projectEnv.findMany({ where: { projectId } });
    const runtimeEnv = this.decryptEnvVars(projectEnv);
    const buildConfig = await this.prisma.buildConfig.findUnique({ where: { projectId } });
    const source = this.parseSource(deployment);
    const logs: string[] = [];
    const onLog = (line: string) => logs.push(line);

    const { buildResult, deployResult } = await this.buildRunner.buildAndDeploy(
      this.buildProvider,
      {
        deploymentId, releaseId: deployment.releaseId!, projectId,
        projectSlug: deployment.project.slug, projectType: deployment.project.type || 'DOCKER',
        source, envVars: runtimeEnv,
        startupTimeoutSeconds: buildConfig?.startupTimeoutSeconds ?? 120, onLog,
      },
    );

    if (deployment.releaseId) {
      await this.prisma.release.update({
        where: { id: deployment.releaseId },
        data: { buildLogs: logs.join('\n'), buildDurationMs: buildResult.buildDurationMs, imageTag: buildResult.imageTag },
      });
    }

    if (deployResult.success) {
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'SUCCESS', deploymentUrl: deployResult.deploymentUrl, completedAt: new Date() },
      });
      await this.prisma.project.update({ where: { id: projectId }, data: { lastDeployAt: new Date() } });
      await this.emit(deploymentId, projectId, userId, 'deployments.deployment.succeeded', { deploymentUrl: deployResult.deploymentUrl, duration: deployResult.deployDurationMs });
    } else {
      await this.markFailed(deploymentId, projectId, deployResult.error || 'Deploy failed');
    }

    await this.releaseLock(projectId, deploymentId);
  }

  async markFailed(deploymentId: string, projectId: string, error: string) {
    await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'FAILED', completedAt: new Date() } });
    await this.emit(deploymentId, projectId, '', 'deployments.deployment.failed', { error });
    await this.releaseLock(projectId, deploymentId);
  }

  private decryptEnvVars(envVars: { key: string; value: string }[]) {
    return envVars.map(({ key, value }) => {
      try { return { key, value: this.cryptoService.decrypt(value) }; } catch { return { key, value }; }
    });
  }

  private parseSource(deployment: any) {
    // The source is encoded into release.sourceUrl at creation time:
    //   git:     the raw URL
    //   archive: "archive://<bucketId>/<objectKey>"
    // The optional dockerfilePath is appended as a query param "?dockerfile=<path>"
    // for both source types (it was previously dropped, so custom Dockerfile
    // paths never reached the build runner).
    const release = deployment.release;
    if (!release) return { type: 'git' as const, url: '', branch: 'main' };

    const rawUrl: string = release.sourceUrl || '';
    const dockerfilePath = this.extractQuery(rawUrl, 'dockerfile');

    // Archive source
    const archiveMatch = rawUrl.match(/^archive:\/\/([^/]+)\/(.+?)(?:\?.*)?$/);
    if (archiveMatch) {
      return {
        type: 'archive' as const,
        archiveBucketId: archiveMatch[1],
        archiveObjectKey: archiveMatch[2],
        dockerfilePath,
      };
    }

    // Git source — strip any query string before passing the URL to git clone.
    const gitUrl = rawUrl.split('?')[0];
    if (gitUrl) return { type: 'git' as const, url: gitUrl, branch: release.branch || 'main', dockerfilePath };
    // Fallback: platform-level sourceRepo from cloned projects
    const project = deployment.project;
    if (project?.sourceRepo) return { type: 'git' as const, url: project.sourceRepo, branch: release.branch || 'main', dockerfilePath };
    return { type: 'git' as const, url: '', branch: release.branch || 'main', dockerfilePath };
  }

  /** Extract a query param from a URL-like string. Returns undefined if absent. */
  private extractQuery(url: string, key: string): string | undefined {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return undefined;
    const params = new URLSearchParams(url.slice(qIndex + 1));
    const val = params.get(key);
    return val ?? undefined;
  }

  private async releaseLock(projectId: string, deploymentId: string) {
    await this.prisma.projectSettings.updateMany({ where: { projectId, activeDeploymentId: deploymentId }, data: { activeDeploymentId: null } });
  }

  private async emit(deploymentId: string, projectId: string, userId: string, type: string, metadata: Record<string, any>) {
    await this.eventService.emit(type as any, {
      id: `${deploymentId}-${Date.now()}`, type, timestamp: new Date(),
      actorId: userId || undefined, actorType: 'user', resourceType: 'deployment', resourceId: deploymentId,
      metadata: { deploymentId, projectId, ...metadata },
    });
  }
}
