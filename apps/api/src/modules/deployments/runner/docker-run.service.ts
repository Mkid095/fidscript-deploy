import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import { DeploymentProfile, RuntimeEnv } from '../types/deployment-profile';

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
  private readonly APP_NETWORK = 'fidscript-app';

  constructor(private configService: ConfigService) {}

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
    const domain = `${projectSlug}.apps.deploy.fidscript.com`;
    const logs: string[] = [];
    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      this.ensureNetwork();
      const runArgs = this.buildRunArgs({ imageTag, containerName, projectSlug, envVars, profile, domain, addLog });
      addLog(`[runner] Starting container: ${containerName}`);
      if (profile.requiresRoute) addLog(`[runner] Route: https://${domain} → port ${profile.defaultPort}`);
      else addLog(`[runner] No route (${profile.label} does not require HTTP routing)`);
      this.exec(runArgs.join(' '));

      if (profile.requiresHealthCheck) {
        addLog(`[runner] Waiting for container (timeout: ${startupTimeoutSeconds}s)…`);
        const healthy = await this.waitForHealth(containerName, profile.healthCheckPath, profile.defaultPort, startupTimeoutSeconds * 1000);
        if (!healthy) {
          let containerLogs = '';
          try { containerLogs = this.exec(`docker logs ${containerName} 2>&1 | tail -20`); } catch { /* ignore */ }
          throw new Error(`Health check failed after ${startupTimeoutSeconds}s.\nPath: GET localhost:${profile.defaultPort}${profile.healthCheckPath}\nLogs:\n${containerLogs}`);
        }
        addLog(`[runner] Container is healthy`);
      } else if (profile.isWorker || profile.isCron) {
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') throw new Error(`Container ${containerName} failed to start. Check docker logs.`);
        addLog(`[runner] Container started (no health check for ${profile.label})`);
      }

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
    const domain = `${projectSlug}.apps.deploy.fidscript.com`;
    const startTime = Date.now();
    const logs: string[] = [];
    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      try { this.exec(`docker rm -f ${containerName}`); } catch { /* ignore */ }
      this.ensureNetwork();
      const runArgs = this.buildRunArgs({ imageTag, containerName, projectSlug, envVars, profile, domain, addLog });
      addLog(`[runner] Rollback: re-running ${imageTag} (no rebuild)`);
      this.exec(runArgs.join(' '));

      if (profile.requiresHealthCheck) {
        addLog(`[runner] Waiting for container (timeout: ${startupTimeoutSeconds}s)…`);
        const healthy = await this.waitForHealth(containerName, profile.healthCheckPath, profile.defaultPort, startupTimeoutSeconds * 1000);
        if (!healthy) {
          let containerLogs = '';
          try { containerLogs = this.exec(`docker logs ${containerName} 2>&1 | tail -20`); } catch { /* ignore */ }
          throw new Error(`Health check failed after ${startupTimeoutSeconds}s.\nLogs:\n${containerLogs}`);
        }
      } else {
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') throw new Error(`Rollback container ${containerName} failed to start.`);
      }

      const deploymentUrl = profile.requiresRoute ? `https://${domain}` : '';
      return { containerId: containerName, deploymentUrl, deployDurationMs: Date.now() - startTime, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[runner] Rollback error: ${msg}`);
      return { containerId: containerName, deploymentUrl: '', deployDurationMs: Date.now() - startTime, success: false, error: msg };
    }
  }

  async teardown(containerName: string): Promise<void> {
    try { this.exec(`docker rm -f ${containerName}`); } catch { /* already gone */ }
  }

  async restart(containerName: string): Promise<void> {
    this.exec(`docker restart ${containerName}`);
  }

  async stop(containerName: string): Promise<void> {
    this.exec(`docker stop ${containerName}`);
  }

  private buildRunArgs(opts: {
    imageTag: string;
    containerName: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    domain: string;
    addLog: (line: string) => void;
  }): string[] {
    const { imageTag, containerName, envVars, profile, domain } = opts;
    const args = ['docker run', '--name', containerName, '--restart', 'unless-stopped',
      '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--tmpfs', '/storage:rw,noexec,nosuid,size=128m',
      '--memory', '512m', '--cpus', '1', '--network', this.APP_NETWORK];
    for (const { key, value } of envVars) args.push('-e', `${key}=${value}`);
    if (!profile.requiresPort) { args.push('--detach', imageTag); return args; }
    args.push('-e', `PORT=${profile.defaultPort}`);
    if (profile.requiresRoute) {
      args.push('-l', 'traefik.enable=true',
        '-l', `traefik.http.routers.${containerName}.rule=Host(\`${domain}\`)`,
        '-l', `traefik.http.routers.${containerName}.entrypoints=websecure`,
        '-l', `traefik.http.routers.${containerName}.tls=true`,
        '-l', `traefik.http.services.${containerName}.loadbalancer.server.port=${profile.defaultPort}`,
        '-l', `traefik.docker.network=${this.APP_NETWORK}`);
    }
    args.push('--detach', imageTag);
    return args;
  }

  private ensureNetwork(): void {
    try {
      this.exec(`docker network create ${this.APP_NETWORK} 2>/dev/null || true`);
      this.exec(`docker network connect ${this.APP_NETWORK} fidscript_traefik 2>/dev/null || true`);
    } catch { /* ignore */ }
  }

  private async waitForHealth(containerName: string, healthCheckPath: string, port: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') return false;
        const result = this.exec(`docker exec ${containerName} sh -c "curl -sf localhost:${port}${healthCheckPath}" 2>/dev/null`);
        if (result.trim() === '' || result.includes('200')) return true;
      } catch { /* not ready */ }
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
}

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
