import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { BuildRunnerService } from './build-runner.service';
import { BuildProviderFactory } from '../providers/build-provider.factory';
import { DeploymentRoutesService } from '../services/deployment-routes.service';
import { DockerLifecycleService } from './docker-lifecycle.service';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';
import { BuildConcurrencyService } from './build-concurrency.service';
import { InstantAppConfigService } from '@/modules/instant/services/instant-app-config.service';
import { scrubSecrets } from './scrub-secrets';
import { DomainReconciliationQueueService } from '@/modules/domains/services/domain-reconciliation-queue.service';
import { deploymentContainerName } from './container-name';

@Injectable()
export class DeploymentStateService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentStateService.name);

  constructor(
    private eventService: EventService,
    private prisma: PrismaService,
    private buildRunner: BuildRunnerService,
    private cryptoService: CryptoService,
    private buildProviderFactory: BuildProviderFactory,
    private routes: DeploymentRoutesService,
    private dockerLifecycle: DockerLifecycleService,
    private github: UserGithubService,
    private buildQueue: BuildConcurrencyService,
    private instantConfig: InstantAppConfigService,
    private domainVerification: DomainReconciliationQueueService,
  ) {}

  onModuleInit() {
    this.eventService.on(
      'deployments.deployment.created',
      this.handleDeploymentCreated.bind(this),
    );
    // Fallback: re-process any PENDING deployments that were orphaned before a fix or
    // missed due to a handler error. Idempotent — runDeployment skips if not PENDING.
    this.recoverStuckDeployments().catch((err) =>
      this.logger.warn(
        `[worker] Stuck deployment recovery failed: ${err.message}`,
      ),
    );
  }

  private async recoverStuckDeployments() {
    // A deployment that was mid-build when the API stopped is orphaned: the
    // build died with it. The API is the only builder, so anything still
    // marked BUILDING at startup is a leftover — it is put back to PENDING
    // and built again.
    const stuck = await this.prisma.deployment.findMany({
      where: { status: { in: ['PENDING', 'BUILDING'] } },
      select: { id: true, projectId: true, status: true },
    });
    if (!stuck.length) return;
    this.logger.log(`[worker] Recovering ${stuck.length} stuck deployment(s)`);
    for (const d of stuck) {
      if (d.status === 'BUILDING') {
        await this.prisma.deployment.update({
          where: { id: d.id },
          data: { status: 'PENDING' },
        });
      }
    }
    await Promise.allSettled(
      stuck.map((d) =>
        this.runDeployment(d.id, d.projectId, '').catch(async (err) => {
          // A recovery that fails must SAY so. Swallowed, the deployment sat
          // in BUILDING for ever with nothing running and nothing logged.
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[worker] Deployment ${d.id} could not be recovered: ${msg}`,
          );
          await this.markFailed(d.id, d.projectId, msg);
        }),
      ),
    );
  }

  private async handleDeploymentCreated(event: any) {
    // The payload IS the event's metadata — `emit(type, projectId, payload)`
    // puts it there. The project the deployment belongs to is on the event
    // itself, not in the payload, and reading it from the payload meant the
    // worker never had both halves: every deployment sat in PENDING for
    // ever, and nothing was ever built.
    const payload = event?.metadata ?? {};
    const deploymentId = payload.deploymentId;
    const projectId = payload.projectId ?? event?.projectId;
    const userId = payload.userId ?? event?.actorId ?? '';
    const envVars = payload.envVars as Record<string, string> | undefined;
    if (!deploymentId || !projectId) {
      this.logger.warn('[worker] Missing deploymentId/projectId');
      return;
    }
    this.logger.log(`[worker] Processing deployment ${deploymentId}`);
    try {
      await this.runDeployment(
        deploymentId,
        projectId,
        (userId as string) || '',
        envVars,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[worker] Deployment ${deploymentId} threw: ${msg}`);
      await this.markFailed(deploymentId, projectId, msg);
    }
  }

  async runDeployment(
    deploymentId: string,
    projectId: string,
    userId: string,
    deployEnvVars?: Record<string, string>,
  ) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true, release: true },
    });
    if (!deployment) {
      this.logger.error(`[worker] Deployment ${deploymentId} not found`);
      return;
    }
    if (deployment.status !== 'PENDING') {
      this.logger.warn(
        `[worker] Deployment ${deploymentId} is ${deployment.status}, skipping`,
      );
      return;
    }

    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId },
    });
    if (settings?.activeDeploymentId) {
      const active = await this.prisma.deployment.findUnique({
        where: { id: settings.activeDeploymentId },
      });
      if (
        active &&
        ['QUEUED', 'BUILDING', 'DEPLOYING'].includes(active.status)
      ) {
        await this.prisma.deployment.update({
          where: { id: deploymentId },
          data: { status: 'BLOCKED' },
        });
        await this.emit(
          deploymentId,
          projectId,
          userId,
          'deployments.deployment.blocked',
          { blockedBy: settings.activeDeploymentId },
        );
        return;
      }
    }

    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: { projectId, activeDeploymentId: deploymentId },
      update: { activeDeploymentId: deploymentId },
    });

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'QUEUED' },
    });
    await this.emit(
      deploymentId,
      projectId,
      userId,
      'deployments.deployment.queued',
      {},
    );

    // Wait for a build slot. A build is heavy, and the box is often a small
    // one — two at once fight each other and can push the machine into swap,
    // which slows the API down with them. A deployment beyond the cap waits
    // in QUEUED, which is what that state is for.
    const releaseSlot = await this.buildQueue.acquire();

    // The build log, and the way it is persisted: lines are appended in
    // memory, fanned out as events, and written through to the release every
    // few seconds — so the console can poll the log and see the build while
    // it happens. Declared here, above the try, so the catch can flush what
    // the build said before the failure is recorded.
    const logs: string[] = [];
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
      } catch {
        /* non-fatal — will retry on next flush */
      }
    };
    const onLog = (line: string) => {
      // A credential that reaches a log is a credential that has leaked —
      // build tools echo their arguments, and clone errors quote the URL.
      const safe = scrubSecrets(line);
      logs.push(safe);
      // Realtime: fan out each build log line to project:<id> so the deployment
      // LogViewer can subscribe via socket instead of polling GET /deployments/:id/logs.
      // Fire-and-forget — emit() returns void; failures must not block the build.
      void this.emit(
        deploymentId,
        projectId,
        userId,
        'deployments.deployment.log',
        { line: safe, index: logs.length - 1 },
      );
      // Debounce: schedule a flush 3s from now, or reset if one is pending
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        flushLogs().catch(() => {});
      }, 3000);
    };

    try {
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'BUILDING' },
      });
      await this.emit(
        deploymentId,
        projectId,
        userId,
        'deployments.deployment.building',
        {},
      );

      const projectEnv = await this.prisma.projectEnv.findMany({
        where: { projectId },
      });
      const runtimeEnv = this.decryptEnvVars(projectEnv);

      // Link the deployment to the project's data plane. An application's
      // tables, users and permissions live in its Instant app, so it needs
      // the app id and the hosts to reach it — under the names Instant's own
      // SDK reads, so it connects with no configuration of its own.
      //
      // A variable the operator has set themselves is left alone: they set
      // it deliberately.
      const instantEnv = await this.instantConfig.environmentFor(projectId);
      if (instantEnv) {
        const set = new Set(runtimeEnv.map((e) => e.key));
        const linked = Object.entries(instantEnv).filter(
          ([key]) => !set.has(key),
        );
        for (const [key, value] of linked) runtimeEnv.push({ key, value });
        if (linked.length) {
          this.logger.log(
            `[worker] Linked ${linked.length} Instant variable(s) into the deployment: ` +
              linked.map(([k]) => k).join(', '),
          );
        }
      }
      // Merge deploy-time env vars (from the wizard) on top of project env vars.
      // Deploy-time values take precedence so users can override without editing project settings.
      if (deployEnvVars && Object.keys(deployEnvVars).length > 0) {
        const existing = new Map(runtimeEnv.map((e) => [e.key, e.value]));
        for (const [key, value] of Object.entries(deployEnvVars)) {
          existing.set(key, value);
        }
        const merged = Array.from(existing, ([key, value]) => ({ key, value }));
        this.logger.log(
          `[worker] Merged ${Object.keys(deployEnvVars).length} deploy-time env var(s) onto ${runtimeEnv.length} project env var(s)`,
        );
        runtimeEnv.length = 0;
        runtimeEnv.push(...merged);
      }
      const buildConfig = await this.prisma.buildConfig.findUnique({
        where: { projectId },
      });

      // Resolve the project owner's connected GitHub token so private repos clone
      // without prompting (parseSource reconstructs the URL from release.sourceUrl
      // but carries no credentials). Anonymous clone still works for public repos.
      const githubCreds = deployment.project?.ownerId
        ? await this.github.getCloneCredentials(deployment.project.ownerId)
        : null;
      const source = this.parseSource(deployment, githubCreds ?? undefined);

      // A build that cannot run without a variable fails BEFORE it starts,
      // naming the variable — in the build log, where the person will read it,
      // not only in the api's own logs. Otherwise the operator reads a build
      // log that says "DATABASE_URL is not defined" three hundred lines in,
      // after three minutes of compiling — or reads nothing at all.
      const missing = (buildConfig?.requiredEnvVars ?? []).filter(
        (key) => !runtimeEnv.some((e) => e.key === key),
      );
      if (missing.length > 0) {
        const names = missing.join(', ');
        const message = `Missing required environment variable${missing.length === 1 ? '' : 's'}: ${names}`;
        this.logger.error(
          `[worker] Deployment ${deploymentId} cannot build — ${message}`,
        );
        await this.markFailed(deploymentId, projectId, message);
        return;
      }

      const projectType = deployment.project.type || 'DOCKER';
      const buildProvider = this.buildProviderFactory.getProvider(
        projectType,
        source,
        deployment.project.slug,
      );

      const { buildResult, deployResult } =
        await this.buildRunner.buildAndDeploy(buildProvider, {
          deploymentId,
          releaseId: deployment.releaseId!,
          projectId,
          projectSlug: deployment.project.slug,
          projectType,
          source,
          envVars: runtimeEnv,
          buildTarget: buildConfig?.buildTarget || undefined,
          buildOverrides: {
            installCommand: buildConfig?.installCommand || undefined,
            buildCommand: buildConfig?.buildCommand || undefined,
            startCommand: buildConfig?.startCommand || undefined,
            port: buildConfig?.port || undefined,
          },
          startupTimeoutSeconds: buildConfig?.startupTimeoutSeconds ?? 120,
          onLog,
          onDeploy: async () => {
            // The image is built; the container is about to start. This state
            // existed in the enum but was never written.
            await this.prisma.deployment.update({
              where: { id: deploymentId },
              data: { status: 'DEPLOYING' },
            });
            await this.emit(
              deploymentId,
              projectId,
              userId,
              'deployments.deployment.deploying',
              {},
            );
          },
        });

      // Final flush of all logs (cancel any pending debounce timer)
      if (flushTimer) clearTimeout(flushTimer);

      if (deployment.releaseId) {
        await this.prisma.release.update({
          where: { id: deployment.releaseId },
          data: {
            buildLogs: logs.join('\n'),
            buildDurationMs: buildResult.buildDurationMs,
            imageTag: buildResult.imageTag,
            // The port the app really listens on. Traefik routes to this,
            // not to the project type's default.
            runtimePort: buildResult.port ?? null,
          },
        });
      }

      if (deployResult.success) {
        await this.prisma.deployment.update({
          where: { id: deploymentId },
          data: {
            status: 'SUCCESS',
            deploymentUrl: deployResult.deploymentUrl,
            completedAt: new Date(),
          },
        });
        await this.prisma.project.update({
          where: { id: projectId },
          data: { lastDeployAt: new Date() },
        });
        await this.emit(
          deploymentId,
          projectId,
          userId,
          'deployments.deployment.succeeded',
          {
            deploymentUrl: deployResult.deploymentUrl,
            duration: deployResult.deployDurationMs,
          },
        );

        // The project has ONE production target: the names that pointed at
        // the previous deployment follow the new one — that is what "the
        // deployment replaced the live one" means to a person's domain.
        await this.prisma.domain.updateMany({
          where: { projectId, deploymentId: { not: deploymentId } },
          data: { deploymentId },
        });

        // Publish the deployment's custom domains to Traefik — and ONLY
        // after the names followed the new deployment: a sync before the
        // re-link writes the previous deployment's router, and that
        // container is torn down a moment later, so the domain serves a
        // 502 until the next sync, which never comes on its own. The
        // default hostname is published by Traefik's Docker provider from
        // the container labels; this covers the rest.
        await this.routes.sync();

        // And ask for their verification now: the routes exist, the
        // container is healthy — the certificate pre-warm and the HTTPS
        // check should run this minute, not on the next schedule tick.
        const attachedDomains = await this.prisma.domain.findMany({
          where: { projectId, deploymentId },
          select: { id: true },
        });
        for (const domain of attachedDomains) {
          try {
            await this.domainVerification.enqueue(domain.id, 'recovery');
          } catch {
            /* the queue is best-effort — the schedule still runs */
          }
        }

        // Clean up the previous deployment's container + image to prevent disk bloat.
        // We keep the container name convention from docker-run.service.ts: fidscript-{slug}-{deploymentId}
        await this.cleanupPreviousDeployment(
          projectId,
          deploymentId,
          deployment.project.slug,
        );
      } else {
        await this.markFailed(
          deploymentId,
          projectId,
          deployResult.error || 'Deploy failed',
        );
      }

      await this.releaseLock(projectId, deploymentId);
    } catch (err) {
      // The in-memory log lines were debounced; a pending flush would race
      // the failure line that markFailed is about to append. Flush what the
      // build said, clear the timer, then let the failure be recorded.
      if (flushTimer) clearTimeout(flushTimer);
      await flushLogs().catch(() => {});
      throw err;
    } finally {
      releaseSlot();
    }
  }

  /**
   * A deployment that failed, recorded everywhere the failure is read.
   *
   * The status says it failed; the **build log says why** — the error is
   * appended to the release's stored log (scrubbed of credentials first), so
   * a person opening the deployment reads the reason where they are already
   * looking, not only in the api's own logs.
   */
  async markFailed(deploymentId: string, projectId: string, error: string) {
    const safe = scrubSecrets(error);
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'FAILED', completedAt: new Date() },
    });

    try {
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        select: { releaseId: true },
      });
      if (deployment?.releaseId) {
        const release = await this.prisma.release.findUnique({
          where: { id: deployment.releaseId },
          select: { buildLogs: true },
        });
        const line = `[error] ${safe}`;
        const existing = release?.buildLogs ?? '';
        await this.prisma.release.update({
          where: { id: deployment.releaseId },
          data: { buildLogs: existing ? `${existing}\n${line}` : line },
        });
        void this.emit(
          deploymentId,
          projectId,
          '',
          'deployments.deployment.log',
          { line },
        );
      }
    } catch {
      /* never fail a failure report */
    }

    await this.emit(
      deploymentId,
      projectId,
      '',
      'deployments.deployment.failed',
      { error: safe },
    );
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
  private async cleanupPreviousDeployment(
    projectId: string,
    newDeploymentId: string,
    projectSlug: string,
  ): Promise<void> {
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

      const oldContainerName = deploymentContainerName(
        projectSlug,
        previous.id,
      );
      this.logger.log(
        `[worker] Cleaning up previous deployment ${previous.id} (container: ${oldContainerName})`,
      );

      // Stop + remove the old container
      await this.dockerLifecycle.teardown(oldContainerName);

      // Keep the record as SUCCESS. It DID succeed — it was simply replaced
      // by a newer deployment, which is not the same thing as being rolled
      // back. Marking it ROLLED_BACK also broke rollback itself: the
      // rollback lookup filters on status SUCCESS, so the deployment a user
      // wanted to roll back to was no longer findable.
      // ProjectSettings.activeDeploymentId says which deployment is live.

      // Note: we DON'T docker rmi the old image here — the GC service handles
      // image removal based on what's still referenced. This keeps rollback
      // working for at least one version back.
    } catch (err) {
      // Cleanup failure shouldn't fail the deployment
      this.logger.warn(
        `[worker] Previous deployment cleanup failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private decryptEnvVars(envVars: { key: string; value: string }[]) {
    return envVars.map(({ key, value }) => {
      try {
        return { key, value: this.cryptoService.decrypt(value) };
      } catch {
        return { key, value };
      }
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
    if (!release)
      return { type: 'git' as const, url: '', branch: 'main', credentials };

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
    if (gitUrl)
      return {
        type: 'git' as const,
        url: gitUrl,
        branch: release.branch || 'main',
        dockerfilePath,
        credentials,
      };
    // Fallback: platform-level sourceRepo from cloned projects
    const project = deployment.project;
    if (project?.sourceRepo)
      return {
        type: 'git' as const,
        url: project.sourceRepo,
        branch: release.branch || 'main',
        dockerfilePath,
        credentials,
      };
    return {
      type: 'git' as const,
      url: '',
      branch: release.branch || 'main',
      dockerfilePath,
      credentials,
    };
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
    await this.prisma.projectSettings.updateMany({
      where: { projectId, activeDeploymentId: deploymentId },
      data: { activeDeploymentId: null },
    });
  }

  private async emit(
    deploymentId: string,
    projectId: string,
    userId: string,
    type: string,
    payload: Record<string, any>,
  ) {
    await this.eventService.emit(
      type as any,
      projectId,
      { deploymentId, ...payload },
      {
        actorId: userId || undefined,
        actorType: 'user',
        resourceType: 'deployment',
        resourceId: deploymentId,
      },
    );
  }
}
