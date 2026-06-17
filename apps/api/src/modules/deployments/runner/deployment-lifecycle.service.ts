import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { BuildRunnerService } from './build-runner.service';

@Injectable()
export class DeploymentLifecycleService {
  private readonly logger = new Logger(DeploymentLifecycleService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private buildRunner: BuildRunnerService,
  ) {}

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
    await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'STOPPED' } });
    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.stopped', {});
  }

  async restartDeployment(deploymentId: string, userId: string): Promise<void> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });
    if (!deployment) throw new Error('Deployment not found');
    if (deployment.status !== 'STOPPED') throw new Error(`Cannot restart deployment with status: ${deployment.status}`);

    const containerName = `fidscript-${deployment.project.slug}-${deploymentId}`;
    await this.buildRunner.restart(containerName);
    await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'SUCCESS' } });
    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.succeeded', { deploymentUrl: deployment.deploymentUrl });
  }

  async destroyDeployment(deploymentId: string, userId: string): Promise<void> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true, release: true },
    });
    if (!deployment) throw new Error('Deployment not found');

    const containerName = `fidscript-${deployment.project.slug}-${deploymentId}`;
    const imageTag = deployment.release?.imageTag || `fidscript/${deployment.project.slug}:unknown`;

    await this.buildRunner.teardown(containerName);
    await this.prisma.deployment.delete({ where: { id: deploymentId } });
    await this.emit(deploymentId, deployment.projectId, userId, 'deployments.deployment.stopped', {});
  }

  private async emit(deploymentId: string, projectId: string, userId: string, type: string, metadata: Record<string, any>) {
    await this.eventService.emit(type as any, {
      id: `${deploymentId}-${Date.now()}`, type, timestamp: new Date(),
      actorId: userId || undefined, actorType: 'user', resourceType: 'deployment', resourceId: deploymentId,
      metadata: { deploymentId, projectId, ...metadata },
    });
  }
}
