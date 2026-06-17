import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  BuildProvider,
  BuildContext,
  BuildResult,
} from './build-provider.interface';

/**
 * DockerfileBuildProvider — builds a project using a user-provided Dockerfile.
 *
 * Validation:
 * - Dockerfile must exist at the source root (or at the specified dockerfilePath)
 * - Build args, env vars, and secrets are passed via --secret (not --build-arg)
 *   to avoid leaking into image layers
 *
 * Future providers (buildpack-based) will implement the same BuildProvider interface
 * and can be swapped in via the strategy field without touching BuildRunnerService.
 */
@Injectable()
export class DockerfileBuildProvider implements BuildProvider {
  name = 'dockerfile';
  private readonly logger = new Logger(DockerfileBuildProvider.name);

  async validate(context: BuildContext): Promise<void> {
    const { source } = context;
    const workspace = this.prepareWorkspace();

    try {
      if (source.type === 'git') {
        await this.fetchGitSource({
          url: source.url!,
          branch: source.branch || 'main',
          credentials: source.credentials,
          workspace,
        });
      } else {
        throw new Error('Archive source not yet supported by DockerfileBuildProvider. Use source.type=git.');
      }

      const dockerfilePath = source.dockerfilePath
        || (existsSync(join(workspace, 'Dockerfile')) ? 'Dockerfile' : null);

      if (!dockerfilePath) {
        throw new Error(
          'No Dockerfile found in the source root. ' +
          'Provide a Dockerfile in your repository root, ' +
          'or specify source.git.dockerfilePath in the deployment request.',
        );
      }

      // Validate the Dockerfile actually exists
      if (!existsSync(join(workspace, dockerfilePath))) {
        throw new Error(`Dockerfile specified at "${dockerfilePath}" does not exist in the source.`);
      }

      this.logger.log(`[DockerfileBuildProvider] Validation passed for ${context.projectSlug}`);
    } finally {
      this.cleanupWorkspace(workspace);
    }
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const { source, envVars, onLog } = context;
    const workspace = this.prepareWorkspace();
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => {
      logs.push(l);
      onLog(l);
    };

    try {
      // ── Fetch source ──────────────────────────────────────────
      if (source.type === 'git') {
        await this.fetchGitSource({
          url: source.url!,
          branch: source.branch || 'main',
          credentials: source.credentials,
          workspace,
        });
      }

      const dockerfilePath = source.dockerfilePath
        || (existsSync(join(workspace, 'Dockerfile')) ? 'Dockerfile' : 'Dockerfile');

      addLog(`[DockerfileBuildProvider] Building with Dockerfile: ${dockerfilePath}`);

      // ── Write env vars to secret file (not build args) ────────
      if (envVars.length > 0) {
        const envFilePath = join(workspace, '.fidscript.env');
        const envFileContent = envVars.map(e => `${e.key}=${e.value}`).join('\n');
        writeFileSync(envFilePath, envFileContent, { mode: 0o600 });
        addLog(`[DockerfileBuildProvider] Wrote ${envVars.length} env vars to .fidscript.env (secret)`);
      }

      // ── Docker build ──────────────────────────────────────────
      // --secret id=envfile,src=.fidscript.env mounts the secret for the build
      // --build-arg BUILDKIT=1 enables BuildKit for caching + secret mounts
      const imageTag = `fidscript/${context.projectSlug}:${context.releaseVersion}`;
      let buildCmd = `docker build -t "${imageTag}" -f "${dockerfilePath}" "${workspace}"`;

      if (envVars.length > 0) {
        buildCmd += ` --secret id=envfile,src="${join(workspace, '.fidscript.env')}"`;
      }

      addLog(`[DockerfileBuildProvider] docker build ${imageTag}`);
      const output = this.exec(buildCmd, { timeout: 600_000 });
      addLog(output);

      return {
        imageTag,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[DockerfileBuildProvider] Build error: ${msg}`);
      return {
        imageTag: `fidscript/${context.projectSlug}:${context.releaseVersion}`,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: false,
        error: msg,
      };
    } finally {
      this.cleanupWorkspace(workspace);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Source fetch (duplicated from BuildRunnerService — extracted here for clarity)
  // ─────────────────────────────────────────────────────────────

  private async fetchGitSource(opts: {
    url: string;
    branch: string;
    credentials?: string;
    workspace: string;
  }): Promise<void> {
    const { url, branch, credentials, workspace } = opts;

    try {
      const cloneCmd = `git clone --depth=1 --branch "${branch}" "${url}" "${workspace}"`;
      if (credentials) {
        const credFile = join(workspace, '.gitcred');
        const [user, token] = credentials.includes(':')
          ? credentials.split(':')
          : ['', credentials];
        const credContent = `username=${user}\npassword=${token}`;
        writeFileSync(credFile, credContent, { mode: 0o600 });
        this.exec(`GIT_TERMINAL_PROMPT=0 git clone --depth=1 --branch "${branch}" "${url}" "${workspace}"`, {
          env: { ...process.env, GIT_ASKPASS: 'echo', GIT_CREDENTIAL_HELPER: `store --file ${credFile}` },
        });
      } else {
        this.exec(`GIT_TERMINAL_PROMPT=0 ${cloneCmd}`);
      }
    } catch (err) {
      throw new Error(`Git clone failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private prepareWorkspace(): string {
    const ws = `/tmp/fidscript-build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(ws, { recursive: true });
    return ws;
  }

  private cleanupWorkspace(ws: string): void {
    try { rmSync(ws, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  private exec(cmd: string, opts?: { timeout?: number; env?: Record<string, string> }): string {
    try {
      return execSync(cmd, {
        timeout: opts?.timeout ?? 300_000,
        stdio: 'pipe',
        env: { ...process.env, DOCKER_BUILDKIT: '1', ...opts?.env },
      } as any).toString();
    } catch (err) {
      const e = err as { message?: string; stderr?: Buffer | string };
      const msg = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || e.message || String(err);
      throw new Error(msg);
    }
  }
}