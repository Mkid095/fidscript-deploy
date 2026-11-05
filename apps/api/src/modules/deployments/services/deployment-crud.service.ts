import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DeploymentWorkerService } from '@/modules/deployments/runner/deployment-worker.service';
import { CreateDeploymentDto, UpdateBuildConfigDto } from '@/modules/deployments/dto/index';
import { NodeBuildpackProvider } from '@/modules/deployments/providers/node-buildpack.provider';
import { DockerBuildWorkspaceService } from '@/modules/deployments/providers/docker-build-workspace.service';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';
import { DeploymentRoutesService } from '@/modules/deployments/services/deployment-routes.service';

@Injectable()
export class DeploymentCrudService {
  private readonly logger = new Logger(DeploymentCrudService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private worker: DeploymentWorkerService,
    private buildpackProvider: NodeBuildpackProvider,
    private workspace: DockerBuildWorkspaceService,
    private github: UserGithubService,
    private configService: ConfigService,
    private routes: DeploymentRoutesService,
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

    // Point the deployment at its hostname.
    //
    // The dashboard has always sent `subdomain` and `domainId` here, but the
    // DTO did not declare them and the API runs with
    // forbidNonWhitelisted — so creating a deployment with a subdomain from
    // the dashboard failed with a 400. The subdomain case also had nowhere
    // to live: the dashboard created the Domain row itself, separately, and
    // only when no domain had been picked.
    //
    // Both are handled here so every client (dashboard, SDK, CLI, MCP)
    // gets the same behaviour: the Domain row is what backs the DNS
    // section, the health checks and the operator console.
    await this.linkDeploymentDomain(projectId, deployment.id, project.slug, dto);

    await this.eventService.emit(
      'deployments.deployment.created',
      projectId,
      { deploymentId: deployment.id, releaseId: release.id, userId, branch: dto.branch, source: dto.source, envVars: dto.envVars },
      { actorId: userId, actorType: 'user', resourceType: 'deployment', resourceId: deployment.id },
    );

    return this.formatDeployment(deployment);
  }

  /**
   * Attach a hostname to a deployment.
   *
   * `domainId` points an EXISTING Domain at the new deployment.
   * `subdomain` creates the {subdomain}.apps.{platformDomain} Domain.
   *
   * The platform already serves the wildcard *.apps.{platformDomain}
   * zone, so a subdomain needs no DNS the operator has to configure —
   * which is why it is created in `manual` mode.
   *
   * A failure here must not fail the deployment: the app is still
   * deploying, and the operator can attach the domain afterwards.
   */
  private async linkDeploymentDomain(
    projectId: string,
    deploymentId: string,
    projectSlug: string,
    dto: CreateDeploymentDto,
  ): Promise<void> {
    try {
      if (dto.domainId) {
        const existing = await this.prisma.domain.findFirst({
          where: { id: dto.domainId, projectId },
        });
        if (!existing) throw new NotFoundException('Domain not found in this project');
        await this.prisma.domain.update({
          where: { id: existing.id },
          data: { deploymentId },
        });
        return;
      }

      if (!dto.subdomain?.trim()) return;

      const platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
      const fqdn = `${dto.subdomain.trim()}.apps.${platformDomain}`;

      const already = await this.prisma.domain.findFirst({ where: { projectId, domain: fqdn } });
      if (already) {
        await this.prisma.domain.update({ where: { id: already.id }, data: { deploymentId } });
        return;
      }

      await this.prisma.domain.create({
        data: {
          projectId,
          domain: fqdn,
          deploymentId,
          // It sits under the platform's own wildcard zone, so it is not a
          // custom domain and there is no DNS for the operator to set up.
          isCustom: false,
          isPrimary: true,
          apexDomain: false,
          type: ['DEPLOYMENT'],
          capabilities: {
            deployment: true,
            email: false,
            inboundEmail: false,
            tracking: false,
            api: false,
            redirect: false,
            sandbox: false,
          },
          dnsMode: 'manual',
          redirectMode: 'none',
          sslEnabled: true,
          sslStatus: 'PENDING',
          dnsStatus: 'PENDING',
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[deployments] Could not link the deployment to its hostname: ${msg}`);
    }
  }

  async list(userId: string, projectId: string, page = 1, limit = 20, status?: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const skip = (page - 1) * limit;
    // The SDK and the MCP tool both send a `status` filter; it used to be
    // accepted and then silently ignored.
    const where: any = { projectId };
    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase();
    }
    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { release: true },
      }),
      this.prisma.deployment.count({ where }),
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
    await this.checkAccessOrThrow(userId, projectId, ['developer', 'admin', 'owner']);
    await this.worker.stopDeployment(deploymentId, userId);
    return this.get(userId, projectId, deploymentId);
  }

  async restart(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId, ['developer', 'admin', 'owner']);
    await this.worker.restartDeployment(deploymentId, userId);
    return this.get(userId, projectId, deploymentId);
  }

  async destroy(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId, ['admin', 'owner']);
    await this.worker.destroyDeployment(deploymentId, userId);
    // Its custom-domain routes have to go with it, or Traefik keeps
    // routing the hostname to a container that no longer exists.
    await this.routes.sync();
    return { success: true };
  }

  async rollback(userId: string, projectId: string, deploymentId: string, targetDeploymentId?: string) {
    await this.checkAccessOrThrow(userId, projectId, ['admin', 'owner']);
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found');
    if (deployment.status !== 'SUCCESS') throw new BadRequestException('Can only rollback successful deployments');
    if (targetDeploymentId) {
      const target = await this.prisma.deployment.findUnique({ where: { id: targetDeploymentId } });
      if (!target || target.projectId !== projectId) throw new NotFoundException('Rollback target deployment not found');
      if (target.status !== 'SUCCESS') throw new BadRequestException('Can only roll back to a successful deployment');
      if (target.id === deploymentId) throw new BadRequestException('A deployment cannot be rolled back to itself');
    }
    await this.worker.rollbackToPreviousImage(deploymentId, userId, targetDeploymentId);
    return this.get(userId, projectId, deploymentId);
  }

  private async checkAccessOrThrow(userId: string, projectId: string, minRoles?: string[]) {
    // API-key callers already passed ProjectMemberGuard — allow through.
    if (userId === 'api-key') return;
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId === userId) return;
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!member) throw new ForbiddenException('Access denied');
    if (minRoles && minRoles.length > 0) {
      const memberRole = (member.role ?? '').toLowerCase();
      if (!minRoles.includes(memberRole)) {
        throw new ForbiddenException(
          `This action requires one of: ${minRoles.join(', ')}. Your role: ${memberRole || 'unknown'}.`,
        );
      }
    }
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
