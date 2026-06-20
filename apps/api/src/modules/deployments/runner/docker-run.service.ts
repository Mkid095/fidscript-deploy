import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeploymentProfile, RuntimeEnv } from '../types/deployment-profile';
import { DockerLifecycleService } from './docker-lifecycle.service';
import { DockerBuildArgsService } from './docker-build-args.service';
import { DockerCommandService } from './docker-command.service';

export interface DeployResult {
  containerId: string;
  deploymentUrl: string;
  deployDurationMs: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class DockerRunService {
  private readonly logger = new Logger(DockerRunService.name);

  constructor(
    private configService: ConfigService,
    private lifecycle: DockerLifecycleService,
    private buildArgs: DockerBuildArgsService,
    private cmd: DockerCommandService,
  ) {}

  async deployContainer(opts: {
    imageTag: string;
    deploymentId: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    startupTimeoutSeconds: number;
    onLog: (line: string) => void;
  }): Promise<DeployResult> {
    const { imageTag, deploymentId, projectSlug, envVars, profile, startupTimeoutSeconds, onLog } = opts;
    const startTime = Date.now();
    const containerName = `fidscript-${projectSlug}-${deploymentId}`;
    const platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
    const domain = `${projectSlug}.apps.${platformDomain}`;
    const logs: string[] = [];
    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      this.lifecycle.ensureNetwork();
      const runArgs = this.buildArgs.buildRunArgs({ imageTag, containerName, projectSlug, envVars, profile, domain });
      addLog(`[runner] Starting container: ${containerName}`);
      if (profile.requiresRoute) addLog(`[runner] Route: https://${domain} → port ${profile.defaultPort}`);
      else addLog(`[runner] No route (${profile.label} does not require HTTP routing)`);
      this.cmd.execDocker(runArgs);
      await this.assertContainerHealthy(opts, containerName, addLog);
      const deploymentUrl = profile.requiresRoute ? `https://${domain}` : '';
      return { containerId: containerName, deploymentUrl, deployDurationMs: Date.now() - startTime, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[runner] Deploy error: ${msg}`);
      return { containerId: containerName, deploymentUrl: '', deployDurationMs: Date.now() - startTime, success: false, error: msg };
    }
  }

  async redeployExistingImage(opts: {
    imageTag: string;
    deploymentId: string;
    projectSlug: string;
    projectType: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    startupTimeoutSeconds: number;
    onLog: (line: string) => void;
  }): Promise<DeployResult> {
    const { imageTag, deploymentId, projectSlug, envVars, profile, startupTimeoutSeconds, onLog } = opts;
    const containerName = `fidscript-${projectSlug}-${deploymentId}`;
    const platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
    const domain = `${projectSlug}.apps.${platformDomain}`;
    const startTime = Date.now();
    const logs: string[] = [];
    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      try { this.lifecycle.teardown(containerName); } catch { /* ignore */ }
      this.lifecycle.ensureNetwork();
      const runArgs = this.buildArgs.buildRunArgs({ imageTag, containerName, projectSlug, envVars, profile, domain });
      addLog(`[runner] Rollback: re-running ${imageTag} (no rebuild)`);
      this.cmd.execDocker(runArgs);
      await this.assertContainerHealthy(opts, containerName, addLog);
      const deploymentUrl = profile.requiresRoute ? `https://${domain}` : '';
      return { containerId: containerName, deploymentUrl, deployDurationMs: Date.now() - startTime, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[runner] Rollback error: ${msg}`);
      return { containerId: containerName, deploymentUrl: '', deployDurationMs: Date.now() - startTime, success: false, error: msg };
    }
  }

  /** Wait for health (HTTP services) or just confirm it started (workers/cron). */
  private async assertContainerHealthy(
    opts: { profile: DeploymentProfile; startupTimeoutSeconds: number },
    containerName: string,
    addLog: (l: string) => void,
  ) {
    const { profile, startupTimeoutSeconds } = opts;
    if (profile.requiresHealthCheck) {
      addLog(`[runner] Waiting for container (timeout: ${startupTimeoutSeconds}s)…`);
      const healthy = await this.cmd.waitForHealth(containerName, profile.healthCheckPath, profile.defaultPort, startupTimeoutSeconds * 1000);
      if (!healthy) {
        let containerLogs = '';
        try { containerLogs = this.cmd.exec(`docker logs ${containerName} 2>&1 | tail -20`); } catch { /* ignore */ }
        throw new Error(`Health check failed after ${startupTimeoutSeconds}s.\nPath: GET localhost:${profile.defaultPort}${profile.healthCheckPath}\nLogs:\n${containerLogs}`);
      }
      addLog(`[runner] Container is healthy`);
      return;
    }
    const status = this.cmd.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
    if (status !== 'true') throw new Error(`Container ${containerName} failed to start. Check docker logs.`);
    addLog(`[runner] Container started (no health check for ${profile.label})`);
  }

  teardown(containerName: string) { return this.lifecycle.teardown(containerName); }
  restart(containerName: string) { return this.lifecycle.restart(containerName); }
  stop(containerName: string) { return this.lifecycle.stop(containerName); }
}
