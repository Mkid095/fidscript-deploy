import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DockerBuildWorkspaceService {
  prepareWorkspace(): string {
    const ws = `/tmp/fidscript-build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(ws, { recursive: true });
    return ws;
  }

  cleanupWorkspace(ws: string): void {
    try { rmSync(ws, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  async fetchGitSource(opts: {
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

  exec(cmd: string, opts?: { timeout?: number; env?: Record<string, string> }): string {
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
