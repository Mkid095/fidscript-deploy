import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DeploymentWorkerService } from '@/modules/deployments/runner/deployment-worker.service';
import { CreateDeploymentDto, UpdateBuildConfigDto } from '@/modules/deployments/dto/index';
import { NodeBuildpackProvider } from '@/modules/deployments/providers/node-buildpack.provider';
import { DockerBuildWorkspaceService } from '@/modules/deployments/providers/docker-build-workspace.service';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';
import * as crypto from 'crypto';

@Injectable()
export class DeploymentCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private worker: DeploymentWorkerService,
    private buildpackProvider: NodeBuildpackProvider,
    private workspace: DockerBuildWorkspaceService,
    private github: UserGithubService,
  ) {}

  // ─── Framework detection (pre-deploy) ──────────────────────────────────────

  /**
   * Clone a repo shallowly, run framework detection, and return a BuildPlan
   * — without deploying. Used by the wizard's "Auto-detect" step.
   */
 async detectFramework(userId: string, projectId: string, dto: { gitUrl: string; branch?: string; credentials?: string }) {
  await this.checkAccessOrThrow(userId, projectId);
  const ws = this.workspace.prepareWorkspace();
  try {
    // Use explicit credentials if provided, otherwise fall back to the user's
    // connected GitHub token so private repos clone without prompting (which
    // would fail in the non-TTY server environment and cause a 400 here).
    const credentials = dto.credentials ?? (await this.github.getCloneCredentials(userId)) ?? undefined;
    await this.workspace.fetchGitSource({
      url: dto.gitUrl,
      branch: dto.branch || 'main',
      credentials,
      workspace: ws,
    });
    const info = await this.buildpackProvider.detectFramework(ws);
    return this.buildpackProvider.toBuildPlan(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Framework detection failed';
    throw new BadRequestException(message);
  } finally {
    this.workspace.cleanupWorkspace(ws);
  }
}

  // ─── Deployment CRUD ───────────────────────────────────────────────────────

  async create(userId: string, projectId: string, dto: CreateDeploymentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.checkAccessOrThrow(userId, projectId);

    const version = this.generateVersion();
    // Encode the source into sourceUrl so the build runner can reconstruct it.
    //   git:     the raw URL (backward compatible)
    //   archive: "archive://<bucketId>/<objectKey>"
    // The optional dockerfilePath is appended as "?dockerfile=<path>" so it
    // reaches the build runner (it was previously dropped).
    const dockerfilePath =
      dto.source?.archive?.dockerfilePath || dto.source?.git?.dockerfilePath;
    const dockerQuery = dockerfilePath ? `?dockerfile=${encodeURIComponent(dockerfilePath)}` : '';

    let sourceUrl: string | undefined;
    if (dto.source?.type === 'archive' && dto.source.archive?.bucketId && dto.source.archive?.objectKey) {
      sourceUrl = `archive://${dto.source.archive.bucketId}/${dto.source.archive.objectKey}${dockerQuery}`;
    } else {
      sourceUrl = (dto.source?.git?.url) ? `${dto.source.git.url}${dockerQuery}` : undefined;
    }
    const release = await this.prisma.release.create({
      data: {
        projectId, version,
        commitSha: dto.commitSha || '',
        branch: dto.branch || project.sourceBranch || 'main',
        sourceUrl,
        imageTag: `fidscript/${project.slug}:${version}`,
        commitMessage: dto.commitMessage || '',
        createdBy: userId,
      },
    });

    const deployment = await this.prisma.deployment.create({
      data: { projectId, releaseId: release.id, status: 'PENDING' },
    });

    await this.eventService.emit(
      'deployments.deployment.created',
      projectId,
      { deploymentId: deployment.id, releaseId: release.id, userId, branch: dto.branch, source: dto.source, envVars: dto.envVars },
      { actorId: userId, actorType: 'user', resourceType: 'deployment', resourceId: deployment.id },
    );

    return this.formatDeployment(deployment);
  }

  async list(userId: string, projectId: string, page = 1, limit = 20) {
    await this.checkAccessOrThrow(userId, projectId);
    const skip = (page - 1) * limit;
    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { release: true },
      }),
      this.prisma.deployment.count({ where: { projectId } }),
    ]);
    return { deployments: deployments.map(d => this.formatDeployment(d, d.release)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async get(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { release: true },
    });
    if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found');
    return this.formatDeployment(deployment, deployment.release);
  }

  async getLogs(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId }, include: { release: true } });
    if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found');
    return { logs: deployment.release?.buildLogs || '' };
  }

  async getBuildConfig(userId: string, projectId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    let config = await this.prisma.buildConfig.findUnique({ where: { projectId } });
    if (!config) config = await this.prisma.buildConfig.create({ data: { projectId } });
    return this.formatBuildConfig(config);
  }

  async updateBuildConfig(userId: string, projectId: string, dto: UpdateBuildConfigDto) {
    await this.checkAccessOrThrow(userId, projectId);
    let config = await this.prisma.buildConfig.findUnique({ where: { projectId } });
    if (!config) config = await this.prisma.buildConfig.create({ data: { projectId } });
    config = await this.prisma.buildConfig.update({
      where: { projectId },
      data: {
        ...(dto.buildTarget !== undefined && { buildTarget: dto.buildTarget }),
        ...(dto.startupTimeoutSeconds !== undefined && { startupTimeoutSeconds: dto.startupTimeoutSeconds }),
      },
    });
    return this.formatBuildConfig(config);
  }

  async stop(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    await this.worker.stopDeployment(deploymentId, userId);
    return this.get(userId, projectId, deploymentId);
  }

  async restart(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    await this.worker.restartDeployment(deploymentId, userId);
    return this.get(userId, projectId, deploymentId);
  }

  async destroy(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    await this.worker.destroyDeployment(deploymentId, userId);
    return { success: true };
  }

  async rollback(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found');
    if (deployment.status !== 'SUCCESS') throw new BadRequestException('Can only rollback successful deployments');
    await this.worker.rollbackToPreviousImage(deploymentId, userId);
    return this.get(userId, projectId, deploymentId);
  }

  private async checkAccessOrThrow(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId === userId) return;
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!member) throw new ForbiddenException('Access denied');
  }

  private generateVersion() { return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`; }

  private formatDeployment(d: any, release?: any) {
    return {
      id: d.id,
      projectId: d.projectId,
      releaseId: d.releaseId || null,
      status: d.status?.toLowerCase(),
      deploymentUrl: d.deploymentUrl || null,
      rolledBackToId: d.rolledBackToId || null,
      createdAt: d.createdAt,
      completedAt: d.completedAt || null,
      branch: release?.branch || null,
      commitSha: release?.commitSha || null,
      commitMessage: release?.commitMessage || null,
      imageTag: release?.imageTag || null,
      // Strip the internal "?dockerfile=..." query and archive:// scheme from
      // the value exposed to the frontend — callers see a clean git URL or
      // the raw object key for archive sources.
      sourceUrl: this.cleanSourceUrlForApi(release?.sourceUrl),
      sourceType: release?.sourceUrl?.startsWith('archive://') ? 'archive'
        : release?.sourceUrl ? 'git' : null,
      version: release?.version || null,
    };
  }

  /**
   * Remove the internal encoding from a stored sourceUrl before returning it
   * via the API. Git URLs keep their scheme/host but lose the dockerfile query;
   * archive sources return their object key only.
   */
  private cleanSourceUrlForApi(raw?: string): string | null {
    if (!raw) return null;
    const noQuery = raw.split('?')[0];
    const archiveMatch = noQuery.match(/^archive:\/\/[^/]+\/(.+)$/);
    if (archiveMatch) return archiveMatch[1];
    return noQuery;
  }

  private formatBuildConfig(c: any) {
    return {
      id: c.id,
      projectId: c.projectId,
      buildTarget: c.buildTarget || null,
      startupTimeoutSeconds: c.startupTimeoutSeconds ?? 120,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
