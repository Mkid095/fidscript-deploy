import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';

@Injectable()
export class DockerLifecycleService {
  private readonly logger = new Logger(DockerLifecycleService.name);
  private readonly APP_NETWORK = 'fidscript-app';

  async teardown(containerName: string): Promise<void> {
    try { this.exec(`docker rm -f ${containerName}`); } catch { /* already gone */ }
  }

  async restart(containerName: string): Promise<void> {
    this.exec(`docker restart ${containerName}`);
  }

  async stop(containerName: string): Promise<void> {
    this.exec(`docker stop ${containerName}`);
  }

  ensureNetwork(): void {
    try {
      this.exec(`docker network create ${this.APP_NETWORK} 2>/dev/null || true`);
      this.exec(`docker network connect ${this.APP_NETWORK} fidscript_traefik 2>/dev/null || true`);
    } catch { /* ignore */ }
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
