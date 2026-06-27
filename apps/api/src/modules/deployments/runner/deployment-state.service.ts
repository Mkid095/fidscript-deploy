import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { BuildRunnerService } from './build-runner.service';
import { BuildProviderFactory } from '../providers/build-provider.factory';
import { DockerLifecycleService } from './docker-lifecycle.service';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';

@Injectable()
export class DeploymentStateService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentStateService.name);

  constructor(
    private eventService: EventService,
    private prisma: PrismaService,
    private buildRunner: BuildRunnerService,
    private cryptoService: CryptoService,
    private buildProviderFactory: BuildProviderFactory,
    private dockerLifecycle: DockerLifecycleService,
    private github: UserGithubService,
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
    const { deploymentId, projectId, userId, envVars } = event.metadata?.metadata || event.metadata || {};
    if (!deploymentId || !projectId) { this.logger.warn('[worker] Missing deploymentId/projectId'); return; }
    this.logger.log(`[worker] Processing deployment ${deploymentId}`);
    try {
      await this.runDeployment(deploymentId, projectId, userId as string || '', envVars as Record<string, string> | undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[worker] Deployment ${deploymentId} threw: ${msg}`);
      await this.markFailed(deploymentId, projectId, msg);
    }
  }

  async runDeployment(deploymentId: string, projectId: string, userId: string, deployEnvVars?: Record<string, string>) {
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
    // Merge deploy-time env vars (from the wizard) on top of project env vars.
    // Deploy-time values take precedence so users can override without editing project settings.
    if (deployEnvVars && Object.keys(deployEnvVars).length > 0) {
      const existing = new Map(runtimeEnv.map(e => [e.key, e.value]));
      for (const [key, value] of Object.entries(deployEnvVars)) {
        existing.set(key, value);
      }
      const merged = Array.from(existing, ([key, value]) => ({ key, value }));
      this.logger.log(`[worker] Merged ${Object.keys(deployEnvVars).length} deploy-time env var(s) onto ${runtimeEnv.length} project env var(s)`);
      runtimeEnv.length = 0;
      runtimeEnv.push(...merged);
    }
    const buildConfig = await this.prisma.buildConfig.findUnique({ where: { projectId } });
    // Resolve the project owner's connected GitHub token so private repos clone
    // without prompting (parseSource reconstructs the URL from release.sourceUrl
    // but carries no credentials). Anonymous clone still works for public repos.
    const githubCreds = deployment.project?.ownerId
      ? await this.github.getCloneCredentials(deployment.project.ownerId)
      : null;
    const source = this.parseSource(deployment, githubCreds ?? undefined);
    const logs: string[] = [];
    // Incremental log persistence: debounce-write to the DB every 3 seconds
    // so the dashboard can poll GET /deployments/:id/logs and see live progress
    // during builds (instead of waiting for the build to complete).
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let lastFlushedLength = 0;
    const flushLogs = async () => {
      const currentLength = logs.length;
      if (currentLength === lastFlushedLength || !deployment.releaseId) return;
      lastFlushedLength = currentLength;
      try {
        await this.prisma.release.update({
          where: { id: deployment.releaseId },
          data: { buildLogs: logs.join('\n') },
        });
      } catch { /* non-fatal — will retry on next flush */ }
    };
    const onLog = (line: string) => {
      logs.push(line);
      // Debounce: schedule a flush 3s from now, or reset if one is pending
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => { flushLogs().catch(() => {}); }, 3000);
    };

    const projectType = deployment.project.type || 'DOCKER';
    const buildProvider = this.buildProviderFactory.getProvider(
      projectType,
      source,
      deployment.project.slug,
    );

    const { buildResult, deployResult } = await this.buildRunner.buildAndDeploy(
      buildProvider,
      {
        deploymentId, releaseId: deployment.releaseId!, projectId,
        projectSlug: deployment.project.slug, projectType,
        source, envVars: runtimeEnv,
        buildTarget: buildConfig?.buildTarget || undefined,
        startupTimeoutSeconds: buildConfig?.startupTimeoutSeconds ?? 120, onLog,
      },
    );

    // Final flush of all logs (cancel any pending debounce timer)
    if (flushTimer) clearTimeout(flushTimer);

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

      // Clean up the previous deployment's container + image to prevent disk bloat.
      // We keep the container name convention from docker-run.service.ts: fidscript-{slug}-{deploymentId}
      await this.cleanupPreviousDeployment(projectId, deploymentId, deployment.project.slug);
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

  /**
   * Clean up the previous successful deployment's container and image.
   * We stop+remove the old container so Traefik stops routing to it, and
   * remove the old image to free disk space. We keep the DB record for
   * rollback history (rollback re-deploys from the stored imageTag).
   *
   * NOTE: we only remove the image — the GC service handles broader cleanup.
   * Rollback still works because it re-deploys an existing image; if the
   * image was GC'd, the user needs to rebuild.
   */
  private async cleanupPreviousDeployment(projectId: string, newDeploymentId: string, projectSlug: string): Promise<void> {
    try {
      // Find the previous successful deployment (before this one)
      const previous = await this.prisma.deployment.findFirst({
        where: {
          projectId,
          status: 'SUCCESS',
          id: { not: newDeploymentId },
        },
        orderBy: { createdAt: 'desc' },
        include: { release: true },
      });

      if (!previous) return;

      const oldContainerName = `fidscript-${projectSlug}-${previous.id}`;
      this.logger.log(`[worker] Cleaning up previous deployment ${previous.id} (container: ${oldContainerName})`);

      // Stop + remove the old container
      await this.dockerLifecycle.teardown(oldContainerName);

      // Mark the old deployment as superseded (keep the record for history)
      await this.prisma.deployment.update({
        where: { id: previous.id },
        data: { status: 'ROLLED_BACK' },
      }).catch(() => { /* ignore if already in a terminal state */ });

      // Note: we DON'T docker rmi the old image here — the GC service handles
      // image removal based on what's still referenced. This keeps rollback
      // working for at least one version back.
    } catch (err) {
      // Cleanup failure shouldn't fail the deployment
      this.logger.warn(`[worker] Previous deployment cleanup failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private decryptEnvVars(envVars: { key: string; value: string }[]) {
    return envVars.map(({ key, value }) => {
      try { return { key, value: this.cryptoService.decrypt(value) }; } catch { return { key, value }; }
    });
  }

  private parseSource(deployment: any, credentials?: string) {
    // The source is encoded into release.sourceUrl at creation time:
    //   git:     the raw URL
    //   archive: "archive://<bucketId>/<objectKey>"
    // The optional dockerfilePath is appended as a query param "?dockerfile=<path>"
    // for both source types (it was previously dropped, so custom Dockerfile
    // paths never reached the build runner).
    // `credentials` (resolved by the caller from the owner's GitHub connection)
    // is threaded into git sources so private repos clone without prompting.
    const release = deployment.release;
    if (!release) return { type: 'git' as const, url: '', branch: 'main', credentials };

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
    if (gitUrl) return { type: 'git' as const, url: gitUrl, branch: release.branch || 'main', dockerfilePath, credentials };
    // Fallback: platform-level sourceRepo from cloned projects
    const project = deployment.project;
    if (project?.sourceRepo) return { type: 'git' as const, url: project.sourceRepo, branch: release.branch || 'main', dockerfilePath, credentials };
    return { type: 'git' as const, url: '', branch: release.branch || 'main', dockerfilePath, credentials };
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
