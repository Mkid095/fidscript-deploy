import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DockerLifecycleService } from '../runner/docker-lifecycle.service';
import { DeploymentRoutesService } from './deployment-routes.service';
import { GithubWebhookService } from './github-webhook.service';
import { DomainCleanupService } from '@/modules/domains/services/domain-cleanup.service';
import { deploymentContainerName } from '../runner/container-name';

/**
 * What a deleted project must not keep: its containers, its routes,
 * and any build it still had in flight.
 *
 * Deleting a project is a soft delete — the record stays for the 30-day
 * recovery window, and the images stay with it, so a restore can light
 * the deployment up again with the one-press redeploy. But the *surface*
 * goes down at the moment of the delete: a deleted project is not a
 * website that still answers on its names.
 *
 *   projects.project.deleted → teardownProject:
 *     - every deployment's container is torn down (the subdomain stops
 *       answering with it — Traefik's Docker provider drops the router
 *       when the container goes)
 *     - anything still building or queued is stopped: a deleted project's
 *       build must not finish and redeploy itself
 *     - the custom-domain routes are rewritten without the project's
 *       names — the edge stops answering on them
 *     - the deletion task records each step, so a failed cleanup can be
 *       retried without redoing the finished work
 *
 *   The sweep (boot + hourly) is the second line: deletions that happened
 *   before a teardown existed — or while the api was down — are found by
 *   asking the database which deleted projects still lack a CLEANED task,
 *   and their surface is taken down then. Idempotent: running it on an
 *   already-quiet project touches nothing.
 *
 *   projects.project.purging → releaseExternal (called by the purge path
 *   before the hard delete, while the domain rows still exist):
 *     - custom domains are released: the customer's captured DNS records
 *       are restored, the mailboxes are stood down
 *     - the GitHub webhook is deleted (best-effort — without it the hook
 *       just stays registered and inert)
 *
 *   projects.project.purged → images go with the record, task is PURGED.
 */

/** One hour: the sweep is a safety net, not a heartbeat. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
/** First sweep after boot: catch the deletions that predate the api. */
const SWEEP_BOOT_DELAY_MS = 60 * 1000;
/** An IN_PROGRESS task older than this is a crashed cleanup, not a running one. */
const STALE_AFTER_MS = 30 * 60 * 1000;

/** Per-resource results, recorded so a retry resumes where it stopped. */
type DeletionResources = {
  inFlightStopped?: string[];
  containersTornDown?: string[];
  routesResyncedAt?: string;
};

@Injectable()
export class DeploymentTeardownService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeploymentTeardownService.name);
  private timer: NodeJS.Timeout | null = null;
  private boot: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private lifecycle: DockerLifecycleService,
    private routes: DeploymentRoutesService,
    private events: EventService,
    private webhooks: GithubWebhookService,
    private domainCleanup: DomainCleanupService,
  ) {}

  onModuleInit() {
    this.events.on('projects.project.deleted', async (event) => {
      if (!event?.projectId) return;
      try {
        await this.teardownProject(event.projectId);
      } catch (err) {
        // Recorded as CLEANUP_FAILED inside; the sweep retries it.
        this.logger.error(
          `[teardown] project ${event.projectId} could not be torn down: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
    this.events.on('projects.project.purged', async (event) => {
      if (!event?.projectId) return;
      const slug = (event?.metadata as { slug?: string } | undefined)?.slug;
      try {
        await this.onPurged(event.projectId, slug);
      } catch (err) {
        this.logger.warn(
          `[teardown] purge cleanup for ${event.projectId} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    });

    // The reconciliation: deleted projects whose cleanup never happened —
    // a deletion before this service existed, or one while the api was
    // down. The boot pass is what repairs those.
    this.boot = setTimeout(() => {
      this.sweep().catch((err: Error) => {
        this.logger.error(`[teardown] boot sweep failed: ${err.message}`);
      });
    }, SWEEP_BOOT_DELAY_MS);
    this.timer = setInterval(() => {
      this.sweep().catch((err: Error) => {
        this.logger.error(`[teardown] sweep failed: ${err.message}`);
      });
    }, SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.boot) clearTimeout(this.boot);
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Take a project's running surface down. Idempotent: running it on an
   * already-quiet project touches nothing. The deletion task tracks every
   * step, so a retry resumes where the last attempt stopped.
   */
  async teardownProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return; // already purged — nothing is left to take down

    // The task is the state machine. A project that was deleted before the
    // table existed (or while the api was down) gets its task now.
    const task = await this.prisma.projectDeletionTask.upsert({
      where: { projectId },
      update: {},
      create: { projectId, state: 'REQUESTED' },
    });

    if (task.state === 'PURGED') return; // the record is gone anyway

    await this.prisma.projectDeletionTask.update({
      where: { projectId },
      data: { state: 'IN_PROGRESS', attempts: task.attempts + 1, lastError: null },
    });

    const resources = (task.resources ?? {}) as DeletionResources;
    const deployments = await this.prisma.deployment.findMany({
      where: { projectId },
      select: { id: true, status: true },
    });

    try {
      // 1. In-flight work is stopped where it stands: a build that
      // finished moments after the delete would otherwise promote a
      // container for a project that no longer exists.
      const activeIds = deployments
        .filter((d) => ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(d.status))
        .map((d) => d.id);
      const newlyStopped = activeIds.filter((id) => !resources.inFlightStopped?.includes(id));
      if (newlyStopped.length) {
        await this.prisma.deployment.updateMany({
          where: { id: { in: newlyStopped } },
          data: { status: 'STOPPED' },
        });
        resources.inFlightStopped = [...(resources.inFlightStopped ?? []), ...newlyStopped];
      }

      // 2. The containers. The name that answered on the subdomain goes
      // down with its container; a container that is already gone is a
      // no-op, so a retry may run the whole list again.
      const pending = deployments
        .map((d) => deploymentContainerName(project.slug, d.id))
        .filter((name) => !resources.containersTornDown?.includes(name));
      for (const name of pending) {
        await this.lifecycle.teardown(name);
        resources.containersTornDown = [
          ...(resources.containersTornDown ?? []),
          name,
        ];
      }

      // 3. The custom names: the routes file is rebuilt from the database,
      // and the query asks only for un-deleted projects — so a later sync
      // by anyone else cannot put the project's routers back.
      await this.routes.sync();
      resources.routesResyncedAt = new Date().toISOString();

      await this.prisma.projectDeletionTask.update({
        where: { projectId },
        data: { state: 'CLEANED', resources, lastError: null },
      });
      this.logger.log(
        `[teardown] project ${project.slug} taken down: ${deployments.length} deployment container(s), routes re-synced`,
      );
    } catch (err) {
      // The step that failed is recorded, and the sweep (or an operator's
      // retry) resumes it: finished steps are in resources, and every
      // step is safe to run again.
      await this.prisma.projectDeletionTask
        .update({
          where: { projectId },
          data: {
            state: 'CLEANUP_FAILED',
            resources,
            lastError: err instanceof Error ? err.message : String(err),
          },
        })
        .catch(() => undefined);
      this.logger.error(
        `[teardown] project ${project.slug} cleanup failed at some step — recorded CLEANUP_FAILED: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  /**
   * The reconciliation pass: every soft-deleted project whose task is not
   * CLEANED gets its surface taken down (again). This is what repairs
   * the deletions that predate the teardown, and it is the standing guard
   * against a container that somehow came back under a deleted project.
   */
  async sweep(): Promise<string[]> {
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
    const tasks = await this.prisma.projectDeletionTask.findMany({
      where: {
        project: { deletedAt: { not: null } },
        OR: [
          { state: 'REQUESTED' },
          { state: 'CLEANUP_FAILED' },
          // A cleanup that was still running when the api went down.
          { state: 'IN_PROGRESS', updatedAt: { lt: staleBefore } },
        ],
      },
    });
    const noTask = await this.prisma.project.findMany({
      where: {
        deletedAt: { not: null },
        deletionTask: null,
      },
      select: { id: true },
    });
    const ids = [...new Set([...tasks.map((t) => t.projectId), ...noTask.map((p) => p.id)])];
    for (const id of ids) {
      try {
        await this.teardownProject(id);
      } catch {
        // Recorded as CLEANUP_FAILED inside; the next sweep retries.
      }
    }
    if (ids.length) {
      this.logger.log(`[teardown] sweep repaired ${ids.length} deleted project(s)`);
    }
    return ids;
  }

  /**
   * Release what the project owns outside the database — called by the
   * purge path while the rows still exist, so it runs BEFORE the hard
   * delete. Both steps are best-effort: a failure leaves a dangling
   * registration or a customer's DNS record, never a blocked purge.
   */
  async releaseExternal(ctx: {
    projectId: string;
    sourceRepo: string | null;
    githubHookId: number | null;
    ownerId: string | null;
  }): Promise<{ domains: { released: number; skipped: number }; webhook: string }> {
    let domains = { released: 0, skipped: 0 };
    let webhookResult: string = 'nothing';
    try {
      domains = await this.domainCleanup.releaseForProject(ctx.projectId, ctx.ownerId ?? 'system');
    } catch (err) {
      this.logger.error(
        `[teardown] domain release for ${ctx.projectId} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    try {
      webhookResult = await this.webhooks.unregisterWebhook(ctx);
    } catch (err) {
      this.logger.warn(
        `[teardown] webhook unregistration for ${ctx.projectId} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    return { domains, webhook: webhookResult };
  }

  /** The record is gone; what remains is the images and the task's tombstone. */
  private async onPurged(projectId: string, slug?: string): Promise<void> {
    if (slug) {
      await this.lifecycle.removeImagesByPrefix(`fidscript/${slug}`);
    }
    await this.prisma.projectDeletionTask
      .update({ where: { projectId }, data: { state: 'PURGED', lastError: null } })
      .catch(() => undefined); // a project that never deleted has no task
  }

  /**
   * An operator's retry from the admin screen: rerun the cleanup for a
   * failed task. Delegates to the idempotent teardown.
   */
  async retry(projectId: string): Promise<void> {
    await this.teardownProject(projectId);
  }
}
