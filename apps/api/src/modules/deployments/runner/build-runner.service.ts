import { Injectable, Logger } from '@nestjs/common';
import { BuildProvider, BuildResult } from '../providers/build-provider.interface';
import { getProfile } from '../types/deployment-profile';
import { DockerRunService } from './docker-run.service';
import { DockerBuildWorkspaceService } from '../providers/docker-build-workspace.service';
import { RuntimeEnv } from '../types/deployment-profile';
export { RuntimeEnv } from '../types/deployment-profile';

export interface BuildAndDeployOptions {
  deploymentId: string;
  releaseId: string;
  projectId: string;
  projectSlug: string;
  projectType: string;
  source: { type: 'git' | 'archive'; url?: string; branch?: string; credentials?: string; dockerfilePath?: string; archiveBucketId?: string; archiveObjectKey?: string };
  envVars: RuntimeEnv[];
  startupTimeoutSeconds: number;
  /** Monorepo app root (e.g. "apps/web") — passed to NodeBuildpackProvider for turbo monorepos */
  buildTarget?: string;
  onLog: (line: string) => void;
}

@Injectable()
export class BuildRunnerService {
  private readonly logger = new Logger(BuildRunnerService.name);

  constructor(
    private dockerRun: DockerRunService,
    private workspace: DockerBuildWorkspaceService,
  ) {}

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

    // Workspace lifecycle is owned by the runner: prepare once, fetch the
    // source into it, share it between validate() and build(), and clean up.
    const ws = this.workspace.prepareWorkspace();
    try {
      await this.fetchSource(source, ws);

      // Validate
      this.log(onLog, `[runner] Validating source with ${provider.name} provider…`);
      await provider.validate({
        deploymentId, releaseId, projectId: opts.projectId, projectSlug, projectType, releaseVersion,
        source, buildCommand: undefined, outputDirectory: undefined, buildTarget: opts.buildTarget,
        envVars, onLog, workspace: ws,
      });

      // Build
      this.log(onLog, `[runner] Building image…`);
      const buildResult = await provider.build({
        deploymentId, releaseId, projectId: opts.projectId, projectSlug, projectType, releaseVersion,
        source, buildCommand: undefined, outputDirectory: undefined, buildTarget: opts.buildTarget,
        envVars, onLog, workspace: ws,
      });

      if (!buildResult.success) {
        return { buildResult, deployResult: { containerId: '', deploymentUrl: '', deployDurationMs: 0, success: false, error: buildResult.error } };
      }

      this.log(onLog, `[runner] Build succeeded in ${buildResult.buildDurationMs}ms`);

      // Deploy
      const deployResult = await this.dockerRun.deployContainer({
        imageTag: buildResult.imageTag, deploymentId, projectSlug, envVars, profile, startupTimeoutSeconds, onLog,
      });

      return { buildResult, deployResult };
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }

  /**
   * Fetch the deployment source into the workspace. Encapsulates the same
   * git / archive dispatch that the build providers used to do internally
   * before workspace ownership moved up to the runner.
   */
  private async fetchSource(
    source: BuildAndDeployOptions['source'],
    workspace: string,
  ): Promise<void> {
    if (source.type === 'git') {
      await this.workspace.fetchGitSource({
        url: source.url!,
        branch: source.branch || 'main',
        credentials: source.credentials,
        workspace,
      });
      return;
    }
    if (source.type === 'archive') {
      if (!source.archiveBucketId || !source.archiveObjectKey) {
        throw new Error('Archive source requires bucketId and objectKey.');
      }
      await this.workspace.fetchArchiveSource({
        bucketId: source.archiveBucketId,
        objectKey: source.archiveObjectKey,
        workspace,
      });
      return;
    }
    throw new Error(`Unsupported source type: ${(source as any).type}`);
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
