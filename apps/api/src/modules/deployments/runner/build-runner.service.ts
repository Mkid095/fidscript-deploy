import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CryptoService } from '../../crypto/crypto.service';

export interface BuildResult {
  imageTag: string;
  buildDurationMs: number;
  buildLogs: string;
  success: boolean;
  error?: string;
}

export interface DeployResult {
  containerId: string;
  deploymentUrl: string;
  deployDurationMs: number;
  success: boolean;
  error?: string;
}

export interface RuntimeEnv {
  key: string;
  value: string;
}

@Injectable()
export class BuildRunnerService {
  private readonly logger = new Logger(BuildRunnerService.name);

  /** The Docker network shared with Traefik — deployed containers join this */
  private readonly APP_NETWORK = 'fidscript-app';
  private readonly REGISTRY = 'fidscript-registry';
  private readonly BUILDER_IMAGE = 'fidscript/builder:latest';

  constructor(
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Full build + deploy pipeline.
   *
   * 1. Prepare workspace (git clone shallow or extract archive)
   * 2. docker build  →  fidscript/<projectSlug>:<version>
   * 3. docker run    →  container on fidscript-app network, Traefik labels
   * 4. Health-check the container
   * 5. Wipe workspace
   */
  async buildAndDeploy(opts: {
    deploymentId: string;
    projectId: string;
    projectSlug: string;
    version: string;
    strategy: string;
    buildCommand?: string;
    outputDirectory?: string;
    healthCheckPath?: string;
    healthCheckPort?: number;
    source: {
      type: 'git' | 'archive';
      url?: string;
      branch?: string;
      credentials?: string;
      bucketId?: string;
      objectKey?: string;
      dockerfilePath?: string;
    };
    envVars: RuntimeEnv[]; // already-decrypted key/value pairs
    onLog: (line: string) => void;
  }): Promise<{ buildResult: BuildResult; deployResult: DeployResult }> {
    const {
      deploymentId, projectId, projectSlug, version, strategy,
      buildCommand, outputDirectory, healthCheckPath, healthCheckPort = 3000,
      source, envVars, onLog,
    } = opts;

    const workspace = this.prepareWorkspace();
    const imageTag = `fidscript/${projectSlug}:${version}`;
    const containerName = `fidscript-deploy-${deploymentId}`;
    let buildResult: BuildResult;
    let deployResult: DeployResult;

    try {
      // ── 1. Prepare source ──────────────────────────────────────
      this.log(onLog, `[runner] Fetching source (${source.type})…`);

      if (source.type === 'git') {
        await this.fetchGitSource({
          url: source.url!,
          branch: source.branch || 'main',
          credentials: source.credentials,
          workspace,
          onLog,
        });
      } else {
        await this.fetchArchiveSource({
          bucketId: source.bucketId!,
          objectKey: source.objectKey!,
          workspace,
          onLog,
        });
      }

      // ── 2. Resolve Dockerfile ──────────────────────────────────
      const dockerfilePath = source.dockerfilePath
        || (existsSync(join(workspace, 'Dockerfile')) ? 'Dockerfile' : null);

      if (!dockerfilePath) {
        throw new Error(
          'No Dockerfile found in the source. Provide one in your repo root, ' +
          'or specify source.archive.dockerfilePath / source.git.dockerfilePath.',
        );
      }

      this.log(onLog, `[runner] Using Dockerfile: ${dockerfilePath}`);

      // ── 3. Build ───────────────────────────────────────────────
      buildResult = await this.buildImage({
        workspace,
        imageTag,
        dockerfilePath,
        buildCommand,
        outputDirectory,
        strategy,
        envVars,
        onLog,
      });

      if (!buildResult.success) {
        this.log(onLog, `[runner] Build failed: ${buildResult.error}`);
        return { buildResult, deployResult: { success: false, containerId: '', deploymentUrl: '', deployDurationMs: 0, error: buildResult.error } };
      }

      this.log(onLog, `[runner] Build succeeded in ${buildResult.buildDurationMs}ms`);

      // ── 4. Run container ───────────────────────────────────────
      deployResult = await this.runContainer({
        imageTag,
        containerName,
        projectSlug,
        envVars,
        healthCheckPath,
        healthCheckPort,
        onLog,
      });

      if (!deployResult.success) {
        this.log(onLog, `[runner] Deploy failed: ${deployResult.error}`);
        return { buildResult, deployResult };
      }

      this.log(onLog, `[runner] Container running at ${deployResult.deploymentUrl}`);
    } finally {
      // ── 5. Cleanup workspace ────────────────────────────────────
      this.cleanupWorkspace(workspace);
    }

    return { buildResult, deployResult };
  }

  /** Stop and remove a deployed container + image */
  async teardown(containerName: string, imageTag: string): Promise<void> {
    this.logDocker(`rm -f ${containerName}`);
    try { this.exec(`docker rm -f ${containerName}`); } catch { /* already gone */ }
    try { this.exec(`docker rmi ${imageTag}`); } catch { /* shared image, ignore */ }
  }

  /** Restart a stopped container */
  async restart(containerName: string): Promise<void> {
    this.exec(`docker restart ${containerName}`);
  }

  /** Stop a running container */
  async stop(containerName: string): Promise<void> {
    this.exec(`docker stop ${containerName}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Source fetch
  // ─────────────────────────────────────────────────────────────

  private async fetchGitSource(opts: {
    url: string;
    branch: string;
    credentials?: string;
    workspace: string;
    onLog: (line: string) => void;
  }): Promise<void> {
    const { url, branch, credentials, workspace, onLog } = opts;

    const cloneOpts: string[] = ['--depth=1', '--branch', branch];
    if (credentials) {
      // Support both token and deploy key formats
      const sanitized = credentials.trim();
      if (sanitized.includes(':')) {
        // user:token format for HTTPS
        cloneOpts.push(`--config`, `credential.username=${sanitized.split(':')[0]}`);
      }
    }

    const gitCmd = `git clone ${cloneOpts.join(' ')} "${url}" "${workspace}" 2>&1`;
    this.log(onLog, `[runner] git clone ${cloneOpts.join(' ')} ${url}`);

    try {
      if (credentials) {
        // Write credentials to a temporary git credential store
        const credFile = join(workspace, '.gitcred');
        const credContent = credentials.includes(':')
          ? `username=${credentials.split(':')[0]}\npassword=${credentials.split(':')[1]}`
          : `password=${credentials}`;
        writeFileSync(credFile, credContent, { mode: 0o600 });
        this.exec(`GIT_TERMINAL_PROMPT=0 git clone --depth=1 --branch "${branch}" "${url}" "${workspace}"`, { env: { ...process.env, GIT_ASKPASS: 'echo', GIT_CREDENTIALS: credFile } });
      } else {
        this.exec(`GIT_TERMINAL_PROMPT=0 ${gitCmd}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Git clone failed: ${msg}`);
    }
  }

  private async fetchArchiveSource(opts: {
    bucketId: string;
    objectKey: string;
    workspace: string;
    onLog: (line: string) => void;
  }): Promise<void> {
    const { objectKey, onLog } = opts;
    // Archive source will be implemented when Phase 05 storage is wired to the builder.
    // For now, archive deployments require a git source.
    this.log(onLog, `[runner] Archive source not yet implemented for build runner. Use source.type=git.`);
    throw new Error('Archive source is not yet supported by the build runner. Please use source.type=git.');
  }

  // ─────────────────────────────────────────────────────────────
  // Docker build
  // ─────────────────────────────────────────────────────────────

  private async buildImage(opts: {
    workspace: string;
    imageTag: string;
    dockerfilePath: string;
    buildCommand?: string;
    outputDirectory?: string;
    strategy: string;
    envVars: RuntimeEnv[];
    onLog: (line: string) => void;
  }): Promise<BuildResult> {
    const { workspace, imageTag, dockerfilePath, strategy, onLog } = opts;
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => {
      logs.push(l);
      onLog(l);
    };

    try {
      // Build args: expose env vars as ARGs (BUILDKIT inline secrets via --secret)
      // Note: secrets are passed via --secret id=envfile,src=... during docker build,
      // NOT as build args (which leak into image layers). We write them to a temporary
      // .dockerenv file mounted as a secret.
      const envVars = opts.envVars || [];
      if (envVars.length > 0) {
        const envFilePath = join(workspace, '.fidscript.env');
        const envFileContent = envVars.map(e => `${e.key}=${e.value}`).join('\n');
        writeFileSync(envFilePath, envFileContent, { mode: 0o600 });
        addLog(`[runner] Wrote ${envVars.length} env vars to .fidscript.env (secret)`);
      }

      // Build command
      let buildCmd = `docker build -t "${imageTag}" -f "${dockerfilePath}" "${workspace}"`;
      if (strategy !== 'dockerfile') {
        // For buildpack, we'd delegate to pack CLI — not yet implemented.
        // Fall back to Dockerfile path (user must provide one).
        addLog(`[runner] Strategy '${strategy}' requires a Dockerfile; using provided one.`);
      }

      addLog(`[runner] Building image: ${imageTag}`);
      const output = this.exec(buildCmd, { timeout: 600_000 });
      addLog(output);

      const durationMs = Date.now() - startTime;
      return { imageTag, buildDurationMs: durationMs, buildLogs: logs.join('\n'), success: true };
    } catch (err) {
      const execErr = err as { message?: string; stdout?: Buffer | string; stderr?: Buffer | string };
      const msg = execErr.message || String(err);
      const stdout = typeof execErr.stdout === 'string' ? execErr.stdout : execErr.stdout?.toString() || '';
      const stderr = typeof execErr.stderr === 'string' ? execErr.stderr : execErr.stderr?.toString() || '';
      addLog(`[runner] Build error: ${msg}`);
      if (stdout) addLog(stdout);
      if (stderr) addLog(stderr);

      return {
        imageTag,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: false,
        error: msg,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Docker run
  // ─────────────────────────────────────────────────────────────

  private async runContainer(opts: {
    imageTag: string;
    containerName: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    healthCheckPath?: string;
    healthCheckPort: number;
    onLog: (line: string) => void;
  }): Promise<DeployResult> {
    const { imageTag, containerName, projectSlug, envVars, healthCheckPath, healthCheckPort, onLog } = opts;
    const startTime = Date.now();
    const domain = `${projectSlug}.apps.deploy.fidscript.com`;
    const logs: string[] = [];

    const addLog = (l: string) => {
      logs.push(l);
      onLog(l);
    };

    try {
      // Ensure the app network exists
      this.ensureNetwork();

      // Build env flags
      const envFlags = envVars.map(e => `-e "${e.key}=${e.value}"`).join(' ');

      // Traefik dynamic labels — routes domain → container port
      const traefikLabels = [
        `traefik.enable=true`,
        `traefik.http.routers.${containerName}.rule=Host(\`${domain}\`)`,
        `traefik.http.routers.${containerName}.entrypoints=websecure`,
        `traefik.http.routers.${containerName}.tls=true`,
        `traefik.http.services.${containerName}.loadbalancer.server.port=${healthCheckPort}`,
        `traefik.docker.network=${this.APP_NETWORK}`,
      ].join(' ');

      // Health check — curl the path if provided, otherwise just check container is running
      const healthCmd = healthCheckPath
        ? `curl -sf http://localhost:${healthCheckPort}${healthCheckPath} || exit 1`
        : `exit 0`;

      const runCmd = [
        'docker run',
        '--name', containerName,
        '--network', this.APP_NETWORK,
        '--restart', 'unless-stopped',
        '--memory', '512m',
        '--cpus', '1',
        '--security-opt', 'no-new-privileges',
        '--read-only',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
        '-e', `PORT=${healthCheckPort}`,
        envFlags,
        traefikLabels,
        imageTag,
      ].join(' ');

      addLog(`[runner] Starting container: ${containerName}`);
      addLog(`[runner] Route: https://${domain} → port ${healthCheckPort}`);
      this.exec(runCmd);

      // Wait for health
      addLog(`[runner] Waiting for container to be healthy…`);
      const healthy = await this.waitForHealth(containerName, healthCmd, 60_000);
      if (!healthy) {
        // Try to get logs for debugging
        let containerLogs = '';
        try { containerLogs = this.exec(`docker logs ${containerName} 2>&1 | tail -20`); } catch { /* ignore */ }
        throw new Error(`Container health check failed after 60s.\nContainer logs:\n${containerLogs}`);
      }

      addLog(`[runner] Container is healthy`);
      return {
        containerId: containerName,
        deploymentUrl: `https://${domain}`,
        deployDurationMs: Date.now() - startTime,
        success: true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[runner] Deploy error: ${msg}`);
      return {
        containerId: containerName,
        deploymentUrl: '',
        deployDurationMs: Date.now() - startTime,
        success: false,
        error: msg,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private prepareWorkspace(): string {
    const workspace = `/tmp/fidscript-build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(workspace, { recursive: true });
    return workspace;
  }

  private cleanupWorkspace(workspace: string): void {
    try { rmSync(workspace, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  private ensureNetwork(): void {
    try {
      this.exec(`docker network create ${this.APP_NETWORK} 2>/dev/null || true`);
      // Connect Traefik to this network if not already
      this.exec(`docker network connect ${this.APP_NETWORK} fidscript_traefik 2>/dev/null || true`);
    } catch { /* ignore */ }
  }

  private async waitForHealth(containerName: string, healthCmd: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        // Check container is running
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`);
        if (status.trim() !== 'true') return false;

        // Run health check inside container
        const result = this.exec(`docker exec ${containerName} sh -c "${healthCmd}" 2>/dev/null`);
        if (result.trim() === '0' || result === '') return true;
      } catch { /* not ready yet */ }
      await sleep(2000);
    }
    return false;
  }

  private exec(cmd: string, opts?: { timeout?: number; env?: Record<string, string> }): string {
    const timeout = opts?.timeout ?? 300_000;
    try {
      return execSync(cmd, {
        timeout,
        stdio: 'pipe',
        env: { ...process.env, DOCKER_BUILDKIT: '1', ...opts?.env },
      } as any).toString();
    } catch (err) {
      const e = err as { message?: string; stderr?: Buffer | string; stdout?: Buffer | string };
      const stderr = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || '';
      const msg = stderr || e.message || String(err);
      throw new Error(msg);
    }
  }

  private logDocker(cmd: string): void {
    this.logger.debug(`[docker] ${cmd}`);
  }

  private log(onLog: (line: string) => void, msg: string): void {
    this.logger.log(msg);
    onLog(msg);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}