import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DockerLifecycleService } from '../runner/docker-lifecycle.service';
import { DeploymentRoutesService } from './deployment-routes.service';
import { deploymentContainerName } from '../runner/container-name';

/**
 * What a deleted project must not keep: its containers, its routes,
 * and any build it still had in flight.
 *
 * Deleting a project is a soft delete — the record stays for the 30-day
 * recovery window, and the images stay with it, so a restore can light
 * the deployment up again with the one-press redeploy. But the *surface*
 * goes down at the moment of the delete: a deleted project is not a
 * website that still answers on its name.
 *
 *   projects.project.deleted → teardownProject:
 *     - every deployment's container is torn down (the subdomain stops
 *       answering with it — Traefik's Docker provider drops the router
 *       when the container goes)
 *     - anything still building or queued is stopped: a deleted project's
 *       build must not finish and redeploy itself
 *     - the custom-domain routes are rewritten without the project's
 *       names — the edge stops answering on them
 *
 *   projects.project.purged → purgeProjectImages:
 *     - the recovery window is over, the record is gone: the images go
 *       with it.
 */
@Injectable()
export class DeploymentTeardownService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentTeardownService.name);

  constructor(
    private prisma: PrismaService,
    private lifecycle: DockerLifecycleService,
    private routes: DeploymentRoutesService,
    private events: EventService,
  ) {}

  onModuleInit() {
    this.events.on('projects.project.deleted', (event) => {
      if (!event?.projectId) return;
      this.teardownProject(event.projectId).catch((err: Error) => {
        this.logger.error(
          `[teardown] project ${event.projectId} could not be torn down: ${err.message}`,
        );
      });
    });
    this.events.on('projects.project.purged', (event) => {
      if (!event?.projectId) return;
      const slug = (event?.metadata as { slug?: string } | undefined)?.slug;
      if (slug) {
        this.lifecycle.removeImagesByPrefix(`fidscript/${slug}`).catch((err: Error) => {
          this.logger.warn(`[teardown] image removal for ${slug} failed: ${err.message}`);
        });
      }
    });
  }

  /**
   * Take a project's running surface down. Idempotent: running it on an
   * already-quiet project touches nothing.
   */
  async teardownProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    const deployments = await this.prisma.deployment.findMany({
      where: { projectId },
      select: { id: true, status: true },
    });

    // In-flight work is stopped where it stands: a build that finished
    // moments after the delete would otherwise promote a container for a
    // project that no longer exists. (The runner's own guard makes a
    // deleted project's deployment un-runnable as well — this is the
    // first line, the guard is the second.)
    for (const deployment of deployments) {
      if (['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(deployment.status)) {
        await this.prisma.deployment.update({
          where: { id: deployment.id },
          data: { status: 'STOPPED' },
        });
      }
    }

    // The containers. The name that answered on the subdomain goes down
    // with its container; a container that is already gone is a no-op.
    for (const deployment of deployments) {
      await this.lifecycle.teardown(
        deploymentContainerName(project.slug, deployment.id),
      );
    }

    // The custom names: the routes file is rewritten without them, and
    // the edge stops answering on those domains from the next reload.
    await this.routes.sync();

    this.logger.log(
      `[teardown] project ${project.slug} taken down: ${deployments.length} deployment container(s), routes re-synced`,
    );
  }
}
