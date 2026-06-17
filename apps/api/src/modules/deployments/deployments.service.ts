import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { DeploymentWorkerService } from './runner/deployment-worker.service';
import {
  CreateDeploymentDto,
  BuildStrategy,
  UpdateBuildConfigDto,
} from './dto/index';
import * as crypto from 'crypto';

@Injectable()
export class DeploymentsService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private worker: DeploymentWorkerService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Create — queues the deployment, worker picks it up async
  // ─────────────────────────────────────────────────────────────

  async create(userId: string, projectId: string, dto: CreateDeploymentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.checkAccessOrThrow(userId, projectId);

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

    // Emit the event the worker listens on — fire-and-forget from the HTTP thread.
    // The worker drives all subsequent state transitions (QUEUED → BUILDING → DEPLOYING → SUCCESS/FAILED).
    await this.eventService.emit('deployments.deployment.created', {
      id: crypto.randomUUID(),
      type: 'deployments.deployment.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'deployment',
      resourceId: deployment.id,
      metadata: {
        deploymentId: deployment.id,
        projectId,
        userId,
        strategy: dto.strategy,
        branch: dto.branch,
        source: dto.source,
      },
    });

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
      }),
      this.prisma.deployment.count({ where: { projectId } }),
    ]);

    return {
      deployments: deployments.map(d => this.formatDeployment(d)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async get(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found');
    }
    return this.formatDeployment(deployment);
  }

  async getLogs(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found');
    }
    return { logs: deployment.buildLogs || '' };
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle ops — delegate to worker
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // Rollback — re-deploys the previous deployment's image (no rebuild)
  // ─────────────────────────────────────────────────────────────

  async rollback(userId: string, projectId: string, deploymentId: string) {
    await this.checkAccessOrThrow(userId, projectId);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found');
    }
    if (deployment.status !== 'SUCCESS') {
      throw new BadRequestException('Can only rollback successful deployments');
    }

    // Delegate to worker — finds previous SUCCESS image, re-runs it without rebuild
    await this.worker.rollbackToPreviousImage(deploymentId, userId);

    return this.get(userId, projectId, deploymentId);
  }

  // ─────────────────────────────────────────────────────────────
  // Build config
  // ─────────────────────────────────────────────────────────────

  async getBuildConfig(userId: string, projectId: string) {
    await this.checkAccessOrThrow(userId, projectId);
    let config = await this.prisma.buildConfig.findUnique({ where: { projectId } });
    if (!config) {
      config = await this.prisma.buildConfig.create({ data: { projectId } });
    }
    return this.formatBuildConfig(config);
  }

  async updateBuildConfig(userId: string, projectId: string, dto: UpdateBuildConfigDto) {
    await this.checkAccessOrThrow(userId, projectId);
    let config = await this.prisma.buildConfig.findUnique({ where: { projectId } });
    if (!config) {
      config = await this.prisma.buildConfig.create({ data: { projectId } });
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
    return this.formatBuildConfig(config);
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async checkAccessOrThrow(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId === userId) return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new ForbiddenException('Access denied');
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