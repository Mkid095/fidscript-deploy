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
      include: { project: true, release: true },
    });

    if (!deployment) {
      this.logger.error(`[worker] Deployment ${deploymentId} not found`);
      return;
    }

    if (deployment.status !== 'PENDING') {
      this.logger.warn(`[worker] Deployment ${deploymentId} is ${deployment.status}, skipping`);
      return;
    }

    // ── Concurrency lock: one active deployment per project ─────
    // Set activeDeploymentId if not already set; if another deployment
    // is already active, block this one until it completes.
    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId },
    });

    if (settings?.activeDeploymentId) {
      // Check if the active deployment is still running
      const activeDeployment = await this.prisma.deployment.findUnique({
        where: { id: settings.activeDeploymentId },
      });
      if (activeDeployment && ['QUEUED', 'BUILDING', 'DEPLOYING'].includes(activeDeployment.status)) {
        // Another deployment is in progress — block this one
        this.logger.log(`[worker] Deployment ${deploymentId} blocked — ${activeDeployment.id} is still active`);
        await this.prisma.deployment.update({
          where: { id: deploymentId },
          data: { status: 'BLOCKED' },
        });
        await this.emit(deploymentId, projectId, userId, 'deployments.deployment.blocked', {
          blockedBy: settings.activeDeploymentId,
        });
        return;
      }
      // Active deployment is done — clear the lock and proceed
    }

    // Acquire lock
    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: { projectId, activeDeploymentId: deploymentId },
      update: { activeDeploymentId: deploymentId },
    });

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

    // ── Build config (startup timeout, health check) ─────────────
    const buildConfig = await this.prisma.buildConfig.findUnique({
      where: { projectId },
    });

    // ── Source resolution ──────────────────────────────────────
    const source = this.parseSource(deployment);

    // ── Build + Deploy ─────────────────────────────────────────
    const logs: string[] = [];
    const onLog = (line: string) => logs.push(line);

    const { buildResult, deployResult } = await this.buildRunner.buildAndDeploy(
      this.buildProvider,
      {
        deploymentId,
        releaseId: deployment.releaseId!,
        projectId,
        projectSlug: deployment.project.slug,
        projectType,
        source,
        envVars: runtimeEnv,
        startupTimeoutSeconds: buildConfig?.startupTimeoutSeconds ?? 120,
        onLog,
      },
    );

    // ── Persist build artifacts to Release ──────────────────────
    if (deployment.releaseId) {
      await this.prisma.release.update({
        where: { id: deployment.releaseId },
        data: {
          buildLogs: logs.join('\n'),
          buildDurationMs: buildResult.buildDurationMs,
          imageTag: buildResult.imageTag, // update placeholder with real tag
        },
      });
    }

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

    // Release the concurrency lock
    await this.releaseLock(projectId, deploymentId);
  }

  private async markFailed(deploymentId: string, projectId: string, error: string) {
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });
    await this.emit(deploymentId, projectId, '', 'deployments.deployment.failed', { error });
    await this.releaseLock(projectId, deploymentId);
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

    const containerName = `fidscript-${deployment.project.slug}-${deploymentId}`;
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

    const containerName = `fidscript-${deployment.project.slug}-${deploymentId}`;
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
      include: { project: true, release: true },
    });
    if (!deployment) throw new Error('Deployment not found');

    const containerName = `fidscript-${deployment.project.slug}-${deploymentId}`;
    const imageTag = deployment.release?.imageTag || `fidscript/${deployment.project.slug}:unknown`;

    await this.buildRunner.teardown(containerName, imageTag);
    await this.prisma.deployment.delete({ where: { id: deploymentId } });

    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.stopped', {});
  }

  /**
   * Rollback to the previous successful deployment's image — no rebuild.
   * Finds the previous SUCCESS deployment's Release (image tag), creates a new
   * Release + Deployment pointing to the same image, marks target as ROLLED_BACK.
   */
  async rollbackToPreviousImage(
    targetDeploymentId: string,
    userId: string,
  ): Promise<void> {
    const target = await this.prisma.deployment.findUnique({
      where: { id: targetDeploymentId },
      include: { project: true, release: true },
    });
    if (!target) throw new Error('Deployment not found');
    if (target.status !== 'SUCCESS') {
      throw new Error('Can only rollback successful deployments');
    }

    // Find the previous SUCCESS deployment and its Release (image tag)
    const previous = await this.prisma.deployment.findFirst({
      where: {
        projectId: target.projectId,
        status: 'SUCCESS',
        id: { not: targetDeploymentId },
        createdAt: { lt: target.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      include: { release: true },
    });
    if (!previous || !previous.release) {
      throw new Error('No previous successful deployment to rollback to');
    }

    const projectType = target.project.type || 'DOCKER';
    const profile = getProfile(projectType);
    const projectEnv = await this.prisma.projectEnv.findMany({ where: { projectId: target.projectId } });
    const runtimeEnv = this.decryptEnvVars(projectEnv);
    const buildConfig = await this.prisma.buildConfig.findUnique({ where: { projectId: target.projectId } });
    const startupTimeout = buildConfig?.startupTimeoutSeconds ?? 120;

    // Create a new Release that re-uses the previous image tag (no rebuild)
    const rollbackVersion = `rollback-${Date.now().toString(36)}`;
    const rollbackRelease = await this.prisma.release.create({
      data: {
        projectId: target.projectId,
        commitSha: previous.release.commitSha,
        branch: previous.release.branch,
        imageTag: previous.release.imageTag, // same image as the previous deployment
        version: rollbackVersion,
        createdBy: userId,
      },
    });

    // Create a new Deployment referencing the rollback Release
    const rollbackDeployment = await this.prisma.deployment.create({
      data: {
        projectId: target.projectId,
        releaseId: rollbackRelease.id,
        status: 'PENDING',
        rolledBackToId: target.id,
      },
    });

    const imageTag = previous.release.imageTag;
    const containerName = `fidscript-${target.project.slug}-${rollbackDeployment.id}`;
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
      startupTimeoutSeconds: startupTimeout,
      onLog,
    });

    await this.prisma.deployment.update({
      where: { id: rollbackDeployment.id },
      data: {
        status: deployResult.success ? 'SUCCESS' : 'FAILED',
        deploymentUrl: deployResult.deploymentUrl,
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

  /** Release the concurrency lock for the project if this deployment holds it. */
  private async releaseLock(projectId: string, deploymentId: string): Promise<void> {
    await this.prisma.projectSettings.updateMany({
      where: { projectId, activeDeploymentId: deploymentId },
      data: { activeDeploymentId: null },
    });
  }

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