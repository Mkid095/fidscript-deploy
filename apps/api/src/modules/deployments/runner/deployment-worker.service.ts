import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { EventService } from '../../events/event.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BuildRunnerService } from './build-runner.service';
import { CryptoService } from '../../crypto/crypto.service';
import { BuildProvider } from '../providers/build-provider.interface';
import { getProfile } from '../types/deployment-profile';
import type { PlatformEvent } from '@fidscript/events';

@Injectable()
export class DeploymentWorkerService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentWorkerService.name);

  constructor(
    private eventService: EventService,
    private prisma: PrismaService,
    private buildRunner: BuildRunnerService,
    private cryptoService: CryptoService,
    @Inject('BUILD_PROVIDER') private buildProvider: BuildProvider,
  ) {}

  onModuleInit() {
    this.eventService.on(
      'deployments.deployment.created',
      this.handleDeploymentCreated.bind(this),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Event handler
  // ─────────────────────────────────────────────────────────────

  private async handleDeploymentCreated(event: PlatformEvent) {
    const { deploymentId, projectId, userId } = (event.metadata as any) || {};
    if (!deploymentId || !projectId) {
      this.logger.warn('[worker] deployments.deployment.created missing deploymentId/projectId');
      return;
    }
    this.logger.log(`[worker] Processing deployment ${deploymentId}`);

    try {
      await this.runDeployment(deploymentId, projectId, userId as string || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[worker] Deployment ${deploymentId} threw: ${msg}`);
      await this.markFailed(deploymentId, projectId, msg);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // State machine
  // ─────────────────────────────────────────────────────────────

  private async runDeployment(
    deploymentId: string,
    projectId: string,
    userId: string,
  ) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });

    if (!deployment) {
      this.logger.error(`[worker] Deployment ${deploymentId} not found`);
      return;
    }

    if (deployment.status !== 'PENDING') {
      this.logger.warn(`[worker] Deployment ${deploymentId} is ${deployment.status}, skipping`);
      return;
    }

    const projectType: string = deployment.project.type || 'DOCKER';

    // ── QUEUED ─────────────────────────────────────────────────
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'QUEUED' },
    });
    await this.emit(deploymentId, projectId, userId, 'deployments.deployment.queued', {});

    // ── BUILDING ───────────────────────────────────────────────
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'BUILDING' },
    });
    await this.emit(deploymentId, projectId, userId, 'deployments.deployment.building', {});

    // ── Decrypt env vars ────────────────────────────────────────
    const projectEnv = await this.prisma.projectEnv.findMany({ where: { projectId } });
    const runtimeEnv = this.decryptEnvVars(projectEnv);

    // ── Source resolution ──────────────────────────────────────
    const source = this.parseSource(deployment);

    // ── Build + Deploy ─────────────────────────────────────────
    const logs: string[] = [];
    const onLog = (line: string) => logs.push(line);

    const { buildResult, deployResult } = await this.buildRunner.buildAndDeploy(
      this.buildProvider,
      {
        deploymentId,
        projectId,
        projectSlug: deployment.project.slug,
        projectType,
        version: deployment.version,
        source,
        envVars: runtimeEnv,
        onLog,
      },
    );

    // ── Persist build logs ─────────────────────────────────────
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        buildLogs: logs.join('\n'),
        buildDurationMs: buildResult.buildDurationMs,
      },
    });

    // ── DEPLOYING → SUCCESS or FAILED ──────────────────────────
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
      await this.emit(deploymentId, projectId, userId, 'deployments.deployment.succeeded', {
        deploymentUrl: deployResult.deploymentUrl,
        duration: deployResult.deployDurationMs,
      });
    } else {
      await this.markFailed(deploymentId, projectId, deployResult.error || 'Deploy failed');
    }
  }

  private async markFailed(deploymentId: string, projectId: string, error: string) {
    const existing = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        buildLogs: existing?.buildLogs || error,
      },
    });
    await this.emit(deploymentId, projectId, '', 'deployments.deployment.failed', { error });
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle ops
  // ─────────────────────────────────────────────────────────────

  async stopDeployment(deploymentId: string, userId: string): Promise<void> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });
    if (!deployment) throw new Error('Deployment not found');
    if (!['SUCCESS', 'DEPLOYING'].includes(deployment.status)) {
      throw new Error(`Cannot stop deployment with status: ${deployment.status}`);
    }

    const containerName = `fidscript-deploy-${deploymentId}`;
    await this.buildRunner.stop(containerName);

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'STOPPED' },
    });

    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.stopped', {});
  }

  async restartDeployment(deploymentId: string, userId: string): Promise<void> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });
    if (!deployment) throw new Error('Deployment not found');
    if (deployment.status !== 'STOPPED') {
      throw new Error(`Cannot restart deployment with status: ${deployment.status}`);
    }

    const containerName = `fidscript-deploy-${deploymentId}`;
    await this.buildRunner.restart(containerName);

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'SUCCESS' },
    });

    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.succeeded', {
      deploymentUrl: deployment.deploymentUrl,
    });
  }

  async destroyDeployment(deploymentId: string, userId: string): Promise<void> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });
    if (!deployment) throw new Error('Deployment not found');

    const containerName = `fidscript-deploy-${deploymentId}`;
    const imageTag = `fidscript/${deployment.project.slug}:${deployment.version}`;

    await this.buildRunner.teardown(containerName, imageTag);
    await this.prisma.deployment.delete({ where: { id: deploymentId } });

    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.stopped', {});
  }

  /**
   * Rollback to the previous successful deployment's image — no rebuild.
   * Finds the previous SUCCESS deployment, re-runs its image via docker run,
   * creates a new SUCCESS rollback deployment record.
   */
  async rollbackToPreviousImage(
    targetDeploymentId: string,
    userId: string,
  ): Promise<void> {
    const target = await this.prisma.deployment.findUnique({
      where: { id: targetDeploymentId },
      include: { project: true },
    });
    if (!target) throw new Error('Deployment not found');
    if (target.status !== 'SUCCESS') {
      throw new Error('Can only rollback successful deployments');
    }

    const previous = await this.prisma.deployment.findFirst({
      where: {
        projectId: target.projectId,
        status: 'SUCCESS',
        id: { not: targetDeploymentId },
        createdAt: { lt: target.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!previous) throw new Error('No previous successful deployment to rollback to');

    const projectType = target.project.type || 'DOCKER';
    const profile = getProfile(projectType);

    const projectEnv = await this.prisma.projectEnv.findMany({ where: { projectId: target.projectId } });
    const runtimeEnv = this.decryptEnvVars(projectEnv);

    const rollbackDeployment = await this.prisma.deployment.create({
      data: {
        projectId: target.projectId,
        version: `rollback-${Date.now().toString(36)}`,
        status: 'PENDING',
        commitSha: target.commitSha,
        commitMessage: `Rollback to ${target.version}`,
        rolledBackToId: target.id,
      },
    });

    const imageTag = `fidscript/${target.project.slug}:${previous.version}`;
    const containerName = `fidscript-deploy-${rollbackDeployment.id}`;
    const domain = `${target.project.slug}.apps.deploy.fidscript.com`;

    const logs: string[] = [];
    const onLog = (line: string) => logs.push(line);

    this.logger.log(`[worker] Rollback ${rollbackDeployment.id} → image ${imageTag} (no rebuild)`);

    const deployResult = await this.buildRunner.redeployExistingImage({
      imageTag,
      deploymentId: rollbackDeployment.id,
      projectSlug: target.project.slug,
      projectType,
      envVars: runtimeEnv,
      profile,
      onLog,
    });

    await this.prisma.deployment.update({
      where: { id: rollbackDeployment.id },
      data: {
        status: deployResult.success ? 'SUCCESS' : 'FAILED',
        deploymentUrl: deployResult.deploymentUrl,
        buildLogs: logs.join('\n'),
        buildDurationMs: deployResult.deployDurationMs,
        completedAt: new Date(),
      },
    });

    await this.prisma.deployment.update({
      where: { id: targetDeploymentId },
      data: { status: 'ROLLED_BACK' },
    });

    await this.emit(rollbackDeployment.id, target.projectId, userId, 'deployments.deployment.succeeded', {
      deploymentUrl: deployResult.deploymentUrl,
      rolledBackToId: targetDeploymentId,
    });
    await this.emit(targetDeploymentId, target.projectId, userId, 'deployments.deployment.rolled_back', {
      rollbackDeploymentId: rollbackDeployment.id,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private decryptEnvVars(envVars: { key: string; value: string }[]): { key: string; value: string }[] {
    return envVars.map(({ key, value }) => {
      try {
        return { key, value: this.cryptoService.decrypt(value) };
      } catch {
        return { key, value };
      }
    });
  }

  private parseSource(deployment: any): { type: 'git' | 'archive'; url?: string; branch?: string; credentials?: string; bucketId?: string; objectKey?: string; dockerfilePath?: string } {
    const project = deployment.project;
    if (project.sourceRepo) {
      return {
        type: 'git',
        url: project.sourceRepo,
        branch: deployment.commitSha || project.sourceBranch || 'main',
      };
    }
    return { type: 'git', url: '', branch: 'main' };
  }

  private async emit(
    deploymentId: string,
    projectId: string,
    userId: string,
    type: string,
    metadata: Record<string, any>,
  ) {
    await this.eventService.emit(type as any, {
      id: `${deploymentId}-${Date.now()}`,
      type,
      timestamp: new Date(),
      actorId: userId || undefined,
      actorType: 'user',
      resourceType: 'deployment',
      resourceId: deploymentId,
      metadata: { deploymentId, projectId, ...metadata },
    });
  }
}