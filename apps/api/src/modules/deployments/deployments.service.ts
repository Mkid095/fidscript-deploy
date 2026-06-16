import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventService } from '../../events/event.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { CreateDeploymentDto, BuildStrategy, UpdateBuildConfigDto } from './dto/index.js';

@Injectable()
export class DeploymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateDeploymentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const version = this.generateVersion();

    const deployment = await this.prisma.deployment.create({
      data: {
        projectId,
        version,
        status: 'PENDING',
        commitSha: dto.commitSha,
        commitMessage: dto.commitMessage,
      },
    });

    await this.eventService.emit('deployment.started', {
      deploymentId: deployment.id,
      projectId,
      userId,
    });

    await this.auditService.log({
      userId,
      action: 'deployment.created',
      resourceType: 'deployment',
      resourceId: deployment.id,
      metadata: { projectId, version },
    });

    return this.formatDeployment(deployment);
  }

  async list(userId: string, projectId: string, page = 1, limit = 20) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const skip = (page - 1) * limit;

    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deployment.count({ where: { projectId } }),
    ]);

    return {
      deployments: deployments.map(d => this.formatDeployment(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async get(userId: string, projectId: string, deploymentId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found');
    }

    return this.formatDeployment(deployment);
  }

  async getLogs(userId: string, projectId: string, deploymentId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found');
    }

    return { logs: deployment.buildLogs || '' };
  }

  async rollback(userId: string, projectId: string, deploymentId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found');
    }

    if (deployment.status !== 'SUCCESS') {
      throw new BadRequestException('Can only rollback successful deployments');
    }

    const previousDeployment = await this.prisma.deployment.findFirst({
      where: {
        projectId,
        status: 'SUCCESS',
        createdAt: { lt: deployment.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!previousDeployment) {
      throw new BadRequestException('No previous deployment to rollback to');
    }

    const rollbackDeployment = await this.prisma.deployment.create({
      data: {
        projectId,
        version: this.generateVersion(),
        status: 'SUCCESS',
        commitSha: deployment.commitSha,
        commitMessage: `Rollback to ${deployment.version}`,
        rolledBackToId: deployment.id,
        deploymentUrl: previousDeployment.deploymentUrl,
        completedAt: new Date(),
      },
    });

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'ROLLED_BACK' },
    });

    await this.eventService.emit('deployment.rolled_back', {
      deploymentId: rollbackDeployment.id,
      rolledBackToId: deploymentId,
      projectId,
      userId,
    });

    await this.auditService.log({
      userId,
      action: 'deployment.rolled_back',
      resourceType: 'deployment',
      resourceId: rollbackDeployment.id,
      metadata: { projectId, rolledBackToId: deploymentId },
    });

    return this.formatDeployment(rollbackDeployment);
  }

  async getBuildConfig(userId: string, projectId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    let config = await this.prisma.buildConfig.findUnique({
      where: { projectId },
    });

    if (!config) {
      config = await this.prisma.buildConfig.create({
        data: { projectId },
      });
    }

    return this.formatBuildConfig(config);
  }

  async updateBuildConfig(userId: string, projectId: string, dto: UpdateBuildConfigDto) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    let config = await this.prisma.buildConfig.findUnique({
      where: { projectId },
    });

    if (!config) {
      config = await this.prisma.buildConfig.create({
        data: { projectId },
      });
    }

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

    await this.auditService.log({
      userId,
      action: 'build_config.updated',
      resourceType: 'build_config',
      resourceId: config.id,
      metadata: dto,
    });

    return this.formatBuildConfig(config);
  }

  async triggerBuild(deploymentId: string) {
    const deployment = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'BUILDING' },
    });

    await this.eventService.emit('deployment.building', {
      deploymentId,
      projectId: deployment.projectId,
    });

    return this.formatDeployment(deployment);
  }

  async completeBuild(deploymentId: string, success: boolean, logs?: string, durationMs?: number) {
    const deployment = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: success ? 'SUCCESS' : 'FAILED',
        buildLogs: logs,
        buildDurationMs: durationMs,
        completedAt: new Date(),
      },
    });

    await this.eventService.emit(
      success ? 'deployment.succeeded' : 'deployment.failed',
      { deploymentId, projectId: deployment.projectId },
    );

    return this.formatDeployment(deployment);
  }

  private async checkAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) return false;

    if (project.ownerId === userId) return true;

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    return !!member;
  }

  private generateVersion(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${timestamp}-${random}`;
  }

  private formatDeployment(deployment: any) {
    return {
      id: deployment.id,
      projectId: deployment.projectId,
      version: deployment.version,
      status: deployment.status.toLowerCase(),
      commitSha: deployment.commitSha,
      commitMessage: deployment.commitMessage,
      buildLogs: deployment.buildLogs,
      buildDurationMs: deployment.buildDurationMs,
      deploymentUrl: deployment.deploymentUrl,
      rolledBackToId: deployment.rolledBackToId,
      createdAt: deployment.createdAt,
      completedAt: deployment.completedAt,
    };
  }

  private formatBuildConfig(config: any) {
    return {
      id: config.id,
      projectId: config.projectId,
      strategy: config.strategy,
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      healthCheckPath: config.healthCheckPath,
      healthCheckPort: config.healthCheckPort,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
