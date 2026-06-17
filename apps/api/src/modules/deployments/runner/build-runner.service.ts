import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import {
  DeploymentProfile,
  getProfile,
} from '../types/deployment-profile';
import {
  BuildProvider,
  BuildContext,
  BuildResult,
  DeployResult,
} from '../providers/build-provider.interface';

export interface RuntimeEnv {
  key: string;
  value: string;
}

export interface BuildAndDeployOptions {
  deploymentId: string;
  projectId: string;
  projectSlug: string;
  projectType: string;
  version: string;
  source: {
    type: 'git' | 'archive';
    url?: string;
    branch?: string;
    credentials?: string;
    dockerfilePath?: string;
  };
  envVars: RuntimeEnv[];
  onLog: (line: string) => void;
}

@Injectable()
export class BuildRunnerService {
  private readonly logger = new Logger(BuildRunnerService.name);

  /** The Docker network shared with Traefik — deployed containers join this */
  private readonly APP_NETWORK = 'fidscript-app';

  constructor(private configService: ConfigService) {}

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Full build + deploy pipeline.
   *
   * 1. Look up DeploymentProfile for the project type
   * 2. Validate source via BuildProvider.validate()
   * 3. Build via BuildProvider.build() (DockerfileBuildProvider today)
   * 4. Run container — branching on profile (worker vs routed vs cron)
   * 5. Health check if required
   * 6. Wipe workspace
   */
  async buildAndDeploy(
    provider: BuildProvider,
    opts: BuildAndDeployOptions,
  ): Promise<{ buildResult: BuildResult; deployResult: DeployResult }> {
    const { deploymentId, projectSlug, projectType, version, source, envVars, onLog } = opts;

    const profile = getProfile(projectType);
    this.logger.log(`[runner] Profile for ${projectType}: route=${profile.requiresRoute} hc=${profile.requiresHealthCheck} worker=${profile.isWorker} cron=${profile.isCron}`);

    // ── Validate source before starting ─────────────────────────
    this.log(onLog, `[runner] Validating source with ${provider.name} provider…`);
    await provider.validate({
      deploymentId,
      projectId: opts.projectId,
      projectSlug,
      projectType,
      version,
      source,
      buildCommand: opts.source.url ? undefined : undefined,
      outputDirectory: undefined,
      envVars,
      onLog,
    });

    // ── Build ───────────────────────────────────────────────────
    this.log(onLog, `[runner] Building image…`);
    const buildResult = await provider.build({
      deploymentId,
      projectId: opts.projectId,
      projectSlug,
      projectType,
      version,
      source,
      buildCommand: undefined,
      outputDirectory: undefined,
      envVars,
      onLog,
    });

    if (!buildResult.success) {
      return {
        buildResult,
        deployResult: {
          containerId: '',
          deploymentUrl: '',
          deployDurationMs: 0,
          success: false,
          error: buildResult.error,
        },
      };
    }

    this.log(onLog, `[runner] Build succeeded in ${buildResult.buildDurationMs}ms`);

    // ── Deploy ──────────────────────────────────────────────────
    const deployResult = await this.deployContainer({
      imageTag: buildResult.imageTag,
      deploymentId,
      projectSlug,
      envVars,
      profile,
      onLog,
    });

    return { buildResult, deployResult };
  }

  // ─────────────────────────────────────────────────────────────
  // Container run — branches on DeploymentProfile
  // ─────────────────────────────────────────────────────────────

  private async deployContainer(opts: {
    imageTag: string;
    deploymentId: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    onLog: (line: string) => void;
  }): Promise<DeployResult> {
    const { imageTag, deploymentId, projectSlug, envVars, profile, onLog } = opts;
    const startTime = Date.now();
    const containerName = `fidscript-${projectSlug}-${deploymentId}`;
    const domain = `${projectSlug}.apps.deploy.fidscript.com`;
    const logs: string[] = [];

    const addLog = (l: string) => {
      logs.push(l);
      onLog(l);
    };

    try {
      this.ensureNetwork();

      const runArgs = this.buildRunArgs({
        imageTag,
        containerName,
        projectSlug,
        envVars,
        profile,
        domain,
        addLog,
      });

      addLog(`[runner] Starting container: ${containerName}`);
      if (profile.requiresRoute) {
        addLog(`[runner] Route: https://${domain} → port ${profile.defaultPort}`);
      } else {
        addLog(`[runner] No route (${profile.label} does not require HTTP routing)`);
      }

      this.exec(runArgs.join(' '));

      // ── Health check (only for routed services) ───────────────
      if (profile.requiresHealthCheck) {
        addLog(`[runner] Waiting for container to be healthy…`);
        const healthy = await this.waitForHealth(
          containerName,
          profile.healthCheckPath,
          profile.defaultPort,
          60_000,
        );
        if (!healthy) {
          let containerLogs = '';
          try { containerLogs = this.exec(`docker logs ${containerName} 2>&1 | tail -20`); } catch { /* ignore */ }
          throw new Error(
            `Container health check failed after 60s.\n` +
            `Health check: GET localhost:${profile.defaultPort}${profile.healthCheckPath}\n` +
            `Container logs:\n${containerLogs}`,
          );
        }
        addLog(`[runner] Container is healthy`);
      } else if (profile.isWorker || profile.isCron) {
        // For workers/cron: just confirm container started and is running
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') {
          throw new Error(`Container ${containerName} failed to start. Check docker logs.`);
        }
        addLog(`[runner] Container started successfully (no health check required for ${profile.label})`);
      }

      const deploymentUrl = profile.requiresRoute ? `https://${domain}` : '';
      return { containerId: containerName, deploymentUrl, deployDurationMs: Date.now() - startTime, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[runner] Deploy error: ${msg}`);
      return { containerId: containerName, deploymentUrl: '', deployDurationMs: Date.now() - startTime, success: false, error: msg };
    }
  }

  /** Build the docker run arguments, branching on profile type */
  private buildRunArgs(opts: {
    imageTag: string;
    containerName: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    domain: string;
    addLog: (line: string) => void;
  }): string[] {
    const { imageTag, containerName, envVars, profile, domain, addLog } = opts;
    const args: string[] = ['docker run'];

    // Naming + restart
    args.push('--name', containerName);
    args.push('--restart', 'unless-stopped');

    // Security hardening
    args.push('--security-opt', 'no-new-privileges');
    args.push('--read-only');
    // Writable tmpfs mounts for framework cache dirs (Next.js, Laravel, Python, etc.)
    args.push('--tmpfs', '/tmp:rw,noexec,nosuid,size=64m');
    args.push('--tmpfs', '/storage:rw,noexec,nosuid,size=128m');

    // Resource limits
    args.push('--memory', '512m');
    args.push('--cpus', '1');

    // Network (all containers join app network; Traefik attaches if requiresRoute)
    args.push('--network', this.APP_NETWORK);

    // Env vars (decrypted from ProjectEnv, injected at runtime — never in image layers)
    for (const { key, value } of envVars) {
      args.push('-e', `${key}=${value}`);
    }

    // For workers/cron: no port, no Traefik labels, no PORT env
    if (!profile.requiresPort) {
      // Worker/Cron: background process, no network exposure
      args.push('--detach');
      args.push(imageTag);
      return args;
    }

    // ── HTTP services (FRONTEND, BACKEND, STATIC, DOCKER) ───────
    args.push('-e', `PORT=${profile.defaultPort}`);

    if (profile.requiresRoute) {
      // Traefik Docker labels
      args.push(
        '-l', `traefik.enable=true`,
        '-l', `traefik.http.routers.${containerName}.rule=Host(\`${domain}\`)`,
        '-l', `traefik.http.routers.${containerName}.entrypoints=websecure`,
        '-l', `traefik.http.routers.${containerName}.tls=true`,
        '-l', `traefik.http.services.${containerName}.loadbalancer.server.port=${profile.defaultPort}`,
        '-l', `traefik.docker.network=${this.APP_NETWORK}`,
      );
    }

    args.push('--detach');
    args.push(imageTag);
    return args;
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle ops
  // ─────────────────────────────────────────────────────────────

  async teardown(containerName: string, _imageTag: string): Promise<void> {
    try { this.exec(`docker rm -f ${containerName}`); } catch { /* already gone */ }
    // Image removal intentionally skipped — shared across deployments
  }

  async restart(containerName: string): Promise<void> {
    this.exec(`docker restart ${containerName}`);
  }

  async stop(containerName: string): Promise<void> {
    this.exec(`docker stop ${containerName}`);
  }

  /**
   * Re-run an already-built image tag (rollback path).
   * Does NOT rebuild — uses the existing image directly.
   * Returns the new container info after re-running.
   */
  async redeployExistingImage(opts: {
    imageTag: string;
    deploymentId: string;
    projectSlug: string;
    projectType: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    onLog: (line: string) => void;
  }): Promise<DeployResult> {
    const { imageTag, deploymentId, projectSlug, projectType, envVars, profile, onLog } = opts;
    const containerName = `fidscript-${projectSlug}-${deploymentId}`;
    const domain = `${projectSlug}.apps.deploy.fidscript.com`;
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      // Remove any existing container with this name first
      try { this.exec(`docker rm -f ${containerName}`); } catch { /* ignore */ }

      this.ensureNetwork();

      const runArgs = this.buildRunArgs({
        imageTag,
        containerName,
        projectSlug,
        envVars,
        profile,
        domain,
        addLog,
      });

      addLog(`[runner] Rollback: re-running existing image ${imageTag} (no rebuild)`);
      this.exec(runArgs.join(' '));

      if (profile.requiresHealthCheck) {
        addLog(`[runner] Waiting for container to be healthy…`);
        const healthy = await this.waitForHealth(
          containerName,
          profile.healthCheckPath,
          profile.defaultPort,
          60_000,
        );
        if (!healthy) {
          let containerLogs = '';
          try { containerLogs = this.exec(`docker logs ${containerName} 2>&1 | tail -20`); } catch { /* ignore */ }
          throw new Error(`Rollback container health check failed.\nContainer logs:\n${containerLogs}`);
        }
      } else {
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') {
          throw new Error(`Rollback container ${containerName} failed to start.`);
        }
      }

      const deploymentUrl = profile.requiresRoute ? `https://${domain}` : '';
      return {
        containerId: containerName,
        deploymentUrl,
        deployDurationMs: Date.now() - startTime,
        success: true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[runner] Rollback error: ${msg}`);
      return { containerId: containerName, deploymentUrl: '', deployDurationMs: Date.now() - startTime, success: false, error: msg };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private ensureNetwork(): void {
    try {
      this.exec(`docker network create ${this.APP_NETWORK} 2>/dev/null || true`);
      this.exec(`docker network connect ${this.APP_NETWORK} fidscript_traefik 2>/dev/null || true`);
    } catch { /* ignore */ }
  }

  private async waitForHealth(
    containerName: string,
    healthCheckPath: string,
    port: number,
    timeoutMs: number,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') return false;
        const result = this.exec(
          `docker exec ${containerName} sh -c "curl -sf localhost:${port}${healthCheckPath}" 2>/dev/null`,
        );
        if (result.trim() === '' || result.includes('200')) return true;
      } catch { /* not ready yet */ }
      await sleep(2000);
    }
    return false;
  }

  private exec(cmd: string): string {
    try {
      return execSync(cmd, { timeout: 60_000, stdio: 'pipe' } as any).toString();
    } catch (err) {
      const e = err as { message?: string; stderr?: Buffer | string };
      const msg = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || e.message || String(err);
      throw new Error(msg);
    }
  }

  private log(onLog: (line: string) => void, msg: string): void {
    this.logger.log(msg);
    onLog(msg);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}