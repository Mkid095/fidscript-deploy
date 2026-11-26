import { Injectable, Logger } from '@nestjs/common';
import { BuildProvider, BuildResult } from '../providers/build-provider.interface';
import { getProfile } from '../types/deployment-profile';
import { DockerRunService } from './docker-run.service';
import { ImageRegistryService } from './image-registry.service';
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
  /**
   * The commands, the port, and the resource ceilings the person set, when
   * they did. Absent fields mean "what the repository says" (or the
   * platform's own ceiling) — the buildpack's own detection stands, and a
   * deployment that nobody configured still works.
   */
  buildOverrides?: {
    installCommand?: string;
    buildCommand?: string;
    startCommand?: string;
    port?: number;
    memoryLimitMb?: number;
    cpuLimitMillicpu?: number;
  };
  onLog: (line: string) => void;
  /**
   * Called after the image is built and before the container is started,
   * so the caller can move the deployment into its DEPLOYING state. The
   * status existed in the enum and was read by the lifecycle service, but
   * nothing ever wrote it — a deployment jumped straight from BUILDING to
   * SUCCESS or FAILED.
   */
  onDeploy?: () => Promise<void>;
}

@Injectable()
export class BuildRunnerService {
  private readonly logger = new Logger(BuildRunnerService.name);

  constructor(
    private dockerRun: DockerRunService,
    private workspace: DockerBuildWorkspaceService,
    private registry: ImageRegistryService,
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
      await this.fetchSource(source, ws, opts.projectId);

      // Validate
      this.log(onLog, `[runner] Validating source with ${provider.name} provider…`);
      await provider.validate({
        deploymentId, releaseId, projectId: opts.projectId, projectSlug, projectType, releaseVersion,
        source, ...this.overridesFor(opts), buildTarget: opts.buildTarget,
        envVars, onLog, workspace: ws,
      });

      // Build
      this.log(onLog, `[runner] Building image…`);
      const buildResult = await provider.build({
        deploymentId, releaseId, projectId: opts.projectId, projectSlug, projectType, releaseVersion,
        source, ...this.overridesFor(opts), buildTarget: opts.buildTarget,
        envVars, onLog, workspace: ws,
      });

      if (!buildResult.success) {
        return { buildResult, deployResult: { containerId: '', deploymentUrl: '', deployDurationMs: 0, success: false, error: buildResult.error } };
      }

      this.log(onLog, `[runner] Build succeeded in ${buildResult.buildDurationMs}ms`);

      // Store the image durably. A built image lives in the host's Docker
      // daemon and nowhere else — if that storage is pruned, the image is
      // gone and the deployment cannot be rolled back to it. The registry
      // is optional: without one, the deployment behaves exactly as before.
      try {
        const pushed = await this.registry.publish(buildResult.imageTag);
        if (pushed) this.log(onLog, `[runner] Pushed ${pushed}`);
      } catch (err) {
        // The image is built and the deployment can still run. A failed
        // push is a durability problem, not a deployment failure.
        const msg = err instanceof Error ? err.message : String(err);
        this.log(onLog, `[runner] Could not push the image to the registry: ${msg}`);
        this.logger.warn(`[runner] Registry push failed: ${msg}`);
      }

      // Deploy
      if (opts.onDeploy) await opts.onDeploy();
      const deployResult = await this.dockerRun.deployContainer({
        imageTag: buildResult.imageTag, deploymentId, projectSlug, envVars, profile, startupTimeoutSeconds, onLog,
        // The person's own port wins over both the provider's detection and
        // the profile's guess — they said what the application listens on.
        port: opts.buildOverrides?.port ?? buildResult.port,
        // The project's own ceilings, when set; otherwise the platform's.
        memoryLimitMb: opts.buildOverrides?.memoryLimitMb,
        cpuLimitMillicpu: opts.buildOverrides?.cpuLimitMillicpu,
      });

      return { buildResult, deployResult };
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }

  /**
   * The overrides as build-context fields. Only the fields the person
   * actually set are carried — an absent field lets the provider's own
   * detection stand.
   */
  private overridesFor(opts: BuildAndDeployOptions): {
    buildCommand?: string;
    installCommand?: string;
    startCommand?: string;
    port?: number;
    outputDirectory?: undefined;
  } {
    const o = opts.buildOverrides;
    if (!o) return { buildCommand: undefined, outputDirectory: undefined };
    return {
      ...(o.buildCommand?.trim() ? { buildCommand: o.buildCommand.trim() } : {}),
      ...(o.installCommand?.trim() ? { installCommand: o.installCommand.trim() } : {}),
      ...(o.startCommand?.trim() ? { startCommand: o.startCommand.trim() } : {}),
      ...(o.port ? { port: o.port } : {}),
    };
  }

  /**
   * Fetch the deployment source into the workspace. Encapsulates the same
   * git / archive dispatch that the build providers used to do internally
   * before workspace ownership moved up to the runner.
   */
  private async fetchSource(
    source: BuildAndDeployOptions['source'],
    workspace: string,
    projectId: string,
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
        projectId,
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
