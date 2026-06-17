import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { BuildRunnerService } from './build-runner.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { getProfile } from '../types/deployment-profile';

@Injectable()
export class DeploymentRollbackService {
  private readonly logger = new Logger(DeploymentRollbackService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private buildRunner: BuildRunnerService,
    private cryptoService: CryptoService,
  ) {}

  async rollbackToPreviousImage(targetDeploymentId: string, userId: string): Promise<void> {
    const target = await this.prisma.deployment.findUnique({
      where: { id: targetDeploymentId },
      include: { project: true, release: true },
    });
    if (!target) throw new Error('Deployment not found');
    if (target.status !== 'SUCCESS') throw new Error('Can only rollback successful deployments');

    const previous = await this.prisma.deployment.findFirst({
      where: { projectId: target.projectId, status: 'SUCCESS', id: { not: targetDeploymentId }, createdAt: { lt: target.createdAt } },
      orderBy: { createdAt: 'desc' },
      include: { release: true },
    });
    if (!previous || !previous.release) throw new Error('No previous successful deployment to rollback to');

    const projectType = target.project.type || 'DOCKER';
    const profile = getProfile(projectType);
    const projectEnv = await this.prisma.projectEnv.findMany({ where: { projectId: target.projectId } });
    const runtimeEnv = this.decryptEnvVars(projectEnv);
    const buildConfig = await this.prisma.buildConfig.findUnique({ where: { projectId: target.projectId } });
    const startupTimeout = buildConfig?.startupTimeoutSeconds ?? 120;

    const rollbackVersion = `rollback-${Date.now().toString(36)}`;
    const rollbackRelease = await this.prisma.release.create({
      data: {
        projectId: target.projectId,
        commitSha: previous.release.commitSha,
        branch: previous.release.branch,
        imageTag: previous.release.imageTag,
        version: rollbackVersion,
        createdBy: userId,
      },
    });

    const rollbackDeployment = await this.prisma.deployment.create({
      data: {
        projectId: target.projectId,
        releaseId: rollbackRelease.id,
        status: 'PENDING',
        rolledBackToId: target.id,
      },
    });

    const logs: string[] = [];
    const onLog = (line: string) => logs.push(line);
    const deployResult = await this.buildRunner.redeployExistingImage({
      imageTag: previous.release.imageTag,
      deploymentId: rollbackDeployment.id,
      projectSlug: target.project.slug,
      projectType,
      envVars: runtimeEnv,
      profile,
      startupTimeoutSeconds: startupTimeout,
      onLog,
    });

    await this.prisma.deployment.update({
      where: { id: rollbackDeployment.id },
      data: { status: deployResult.success ? 'SUCCESS' : 'FAILED', deploymentUrl: deployResult.deploymentUrl, completedAt: new Date() },
    });
    await this.prisma.deployment.update({ where: { id: targetDeploymentId }, data: { status: 'ROLLED_BACK' } });

    await this.emit(rollbackDeployment.id, target.projectId, userId, 'deployments.deployment.succeeded', { deploymentUrl: deployResult.deploymentUrl, rolledBackToId: targetDeploymentId });
    await this.emit(targetDeploymentId, target.projectId, userId, 'deployments.deployment.rolled_back', { rollbackDeploymentId: rollbackDeployment.id });
  }

  private decryptEnvVars(envVars: { key: string; value: string }[]) {
    return envVars.map(({ key, value }) => {
      try { return { key, value: this.cryptoService.decrypt(value) }; } catch { return { key, value }; }
    });
  }

  private async emit(deploymentId: string, projectId: string, userId: string, type: string, metadata: Record<string, any>) {
    await this.eventService.emit(type as any, {
      id: `${deploymentId}-${Date.now()}`, type, timestamp: new Date(),
      actorId: userId || undefined, actorType: 'user', resourceType: 'deployment', resourceId: deploymentId,
      metadata: { deploymentId, projectId, ...metadata },
    });
  }
}
