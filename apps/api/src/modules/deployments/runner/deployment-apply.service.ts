import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { BuildRunnerService } from './build-runner.service';
import { getProfile } from '../types/deployment-profile';

/**
 * Applying the project's build settings to what is running **now**.
 *
 * A container's ceilings are fixed when it is created: `docker restart`
 * keeps the old ones, so a limit that was just changed would sit in the
 * build config while the live container ran on the old envelope. This
 * service tears the live container down and starts it again from the same
 * image — not a new version, not a version change, just the same release in
 * a new envelope. The names stay where they are; only the container's
 * limits move.
 */
@Injectable()
export class DeploymentApplyService {
  private readonly logger = new Logger(DeploymentApplyService.name);

  constructor(
    private prisma: PrismaService,
    private buildRunner: BuildRunnerService,
    private cryptoService: CryptoService,
  ) {}

  async applyBuildConfig(
    projectId: string,
  ): Promise<{
    deploymentId: string;
    containerName: string;
    success: boolean;
    memoryLimitMb: number;
    cpuLimitMillicpu: number;
    error?: string;
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new Error('Project not found');

    // What is live: the settings row holds the active deployment's id.
    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId },
    });
    let active = settings?.activeDeploymentId
      ? await this.prisma.deployment.findUnique({
          where: { id: settings.activeDeploymentId },
          include: { release: true },
        })
      : null;
    if (!active?.release) {
      // The settings field is not written by the deployment flow — when it
      // is empty, the newest successful deployment is what has the
      // container that is running now.
      active = await this.prisma.deployment.findFirst({
        where: { projectId, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        include: { release: true },
      });
    }
    if (!active?.release) {
      throw new Error('Nothing is running yet — apply the settings on the next deploy.');
    }

    const buildConfig = await this.prisma.buildConfig.findUnique({
      where: { projectId },
    });

    const projectType = project.type || 'DOCKER';
    const profile = getProfile(projectType);
    const projectEnv = await this.prisma.projectEnv.findMany({
      where: { projectId },
    });
    const runtimeEnv = this.decryptEnvVars(projectEnv);

    const memoryLimitMb = buildConfig?.memoryLimitMb ?? 512;
    const cpuLimitMillicpu = buildConfig?.cpuLimitMillicpu ?? 1000;

    const logs: string[] = [];
    const result = await this.buildRunner.redeployExistingImage({
      imageTag: active.release.imageTag,
      deploymentId: active.id,
      projectSlug: project.slug,
      projectType,
      envVars: runtimeEnv,
      profile,
      startupTimeoutSeconds: buildConfig?.startupTimeoutSeconds ?? 120,
      onLog: (line) => logs.push(line),
      // The person's own port wins; otherwise the one the last build told
      // us the application listens on.
      port: buildConfig?.port ?? active.release.runtimePort ?? undefined,
      memoryLimitMb,
      cpuLimitMillicpu,
    });

    if (!result.success) {
      // The old container is already torn down and the new one will not
      // run: the deployment is not running, and the record must say so.
      await this.prisma.deployment.update({
        where: { id: active.id },
        data: { status: 'FAILED' },
      });
      this.logger.error(
        `[apply] build-config apply failed for ${project.slug}: ${result.error}`,
      );
      return {
        deploymentId: active.id,
        containerName: result.containerId,
        success: false,
        memoryLimitMb,
        cpuLimitMillicpu,
        error: result.error,
      };
    }

    this.logger.log(
      `[apply] ${project.slug} re-run under ${memoryLimitMb}MB / ${cpuLimitMillicpu}mCPU`,
    );
    return {
      deploymentId: active.id,
      containerName: result.containerId,
      success: true,
      memoryLimitMb,
      cpuLimitMillicpu,
    };
  }

  private decryptEnvVars(envVars: { key: string; value: string }[]) {
    return envVars.map(({ key, value }) => {
      try {
        return { key, value: this.cryptoService.decrypt(value) };
      } catch {
        return { key, value };
      }
    });
  }
}
