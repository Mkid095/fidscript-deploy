import { Injectable, Logger } from '@nestjs/common';
import { BuildProvider, BuildResult } from '../providers/build-provider.interface';
import { getProfile } from '../types/deployment-profile';
import { DockerRunService } from './docker-run.service';
import { RuntimeEnv } from '../types/deployment-profile';
export { RuntimeEnv } from '../types/deployment-profile';

export interface BuildAndDeployOptions {
  deploymentId: string;
  releaseId: string;
  projectId: string;
  projectSlug: string;
  projectType: string;
  source: { type: 'git' | 'archive'; url?: string; branch?: string; credentials?: string; dockerfilePath?: string };
  envVars: RuntimeEnv[];
  startupTimeoutSeconds: number;
  onLog: (line: string) => void;
}

@Injectable()
export class BuildRunnerService {
  private readonly logger = new Logger(BuildRunnerService.name);

  constructor(private dockerRun: DockerRunService) {}

  async buildAndDeploy(
    provider: BuildProvider,
    opts: BuildAndDeployOptions,
  ): Promise<{ buildResult: BuildResult; deployResult: ReturnType<DockerRunService['deployContainer']> extends Promise<infer R> ? R : never }> {
    const { deploymentId, releaseId, projectSlug, projectType, source, envVars, startupTimeoutSeconds, onLog } = opts;

    const { PrismaService } = await import('../../../prisma/prisma.service');
    const prisma = new PrismaService();
    const release = await prisma.release.findUnique({ where: { id: releaseId } });
    if (!release) throw new Error(`Release ${releaseId} not found`);
    const releaseVersion = release.version;

    const profile = getProfile(projectType);
    this.logger.log(`[runner] Profile ${projectType}: route=${profile.requiresRoute} hc=${profile.requiresHealthCheck}`);

    // Validate
    this.log(onLog, `[runner] Validating source with ${provider.name} provider…`);
    await provider.validate({ deploymentId, releaseId, projectId: opts.projectId, projectSlug, projectType, releaseVersion, source, buildCommand: undefined, outputDirectory: undefined, envVars, onLog });

    // Build
    this.log(onLog, `[runner] Building image…`);
    const buildResult = await provider.build({ deploymentId, releaseId, projectId: opts.projectId, projectSlug, projectType, releaseVersion, source, buildCommand: undefined, outputDirectory: undefined, envVars, onLog });

    if (!buildResult.success) {
      return { buildResult, deployResult: { containerId: '', deploymentUrl: '', deployDurationMs: 0, success: false, error: buildResult.error } };
    }

    this.log(onLog, `[runner] Build succeeded in ${buildResult.buildDurationMs}ms`);

    // Deploy
    const deployResult = await this.dockerRun.deployContainer({
      imageTag: buildResult.imageTag, deploymentId, projectSlug, envVars, profile, startupTimeoutSeconds, onLog,
    });

    return { buildResult, deployResult };
  }

  async redeployExistingImage(opts: Parameters<DockerRunService['redeployExistingImage']>[0] & { projectType: string }) {
    return this.dockerRun.redeployExistingImage(opts);
  }

  async teardown(containerName: string) { return this.dockerRun.teardown(containerName); }
  async restart(containerName: string) { return this.dockerRun.restart(containerName); }
  async stop(containerName: string) { return this.dockerRun.stop(containerName); }

  private log(onLog: (line: string) => void, msg: string): void {
    this.logger.log(msg);
    onLog(msg);
  }
}
