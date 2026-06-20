import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DeploymentWorkerService } from '@/modules/deployments/runner/deployment-worker.service';
import { CreateDeploymentDto, UpdateBuildConfigDto } from '@/modules/deployments/dto/index';
import * as crypto from 'crypto';

@Injectable()
export class DeploymentCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private worker: DeploymentWorkerService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateDeploymentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.checkAccessOrThrow(userId, projectId);

    const version = this.generateVersion();
    const release = await this.prisma.release.create({
      data: {
        projectId, version,
        commitSha: dto.commitSha || '',
        branch: dto.branch || project.sourceBranch || 'main',
        sourceUrl: dto.source?.git?.url || undefined,
        imageTag: `fidscript/${project.slug}:${version}`,
        createdBy: userId,
      },
    });

    const deployment = await this.prisma.deployment.create({
      data: { projectId, releaseId: release.id, status: 'PENDING' },
    });

    await this.eventService.emit('deployments.deployment.created', {
      id: crypto.randomUUID(), type: 'deployments.deployment.created',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'deployment', resourceId: deployment.id,
      metadata: { deploymentId: deployment.id, releaseId: release.id, projectId, userId, strategy: dto.strategy, branch: dto.branch, source: dto.source },
    });

    return this.formatDeployment(deployment);
  }

  async list(userId: string, projectId: string, page = 1, limit = 20) {
    await this.checkAccessOrThrow(userId, projectId);
    const skip = (page - 1) * limit;
    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.deployment.count({ where: { projectId } }),
    ]);
    return { deployments: deployments.map(d => this.formatDeployment(d)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async get(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found');
    return this.formatDeployment(deployment);
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
        ...(dto.strategy && { strategy: dto.strategy }),
        ...(dto.buildCommand !== undefined && { buildCommand: dto.buildCommand }),
        ...(dto.outputDirectory !== undefined && { outputDirectory: dto.outputDirectory }),
        ...(dto.healthCheckPath !== undefined && { healthCheckPath: dto.healthCheckPath }),
        ...(dto.healthCheckPort !== undefined && { healthCheckPort: dto.healthCheckPort }),
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

  private formatDeployment(d: any) {
    return { id: d.id, projectId: d.projectId, releaseId: d.releaseId || null, status: d.status?.toLowerCase(), deploymentUrl: d.deploymentUrl || null, rolledBackToId: d.rolledBackToId || null, createdAt: d.createdAt, completedAt: d.completedAt || null };
  }

  private formatBuildConfig(c: any) {
    return { id: c.id, projectId: c.projectId, strategy: c.strategy, buildCommand: c.buildCommand, outputDirectory: c.outputDirectory, healthCheckPath: c.healthCheckPath, healthCheckPort: c.healthCheckPort, startupTimeoutSeconds: c.startupTimeoutSeconds, createdAt: c.createdAt, updatedAt: c.updatedAt };
  }
}
