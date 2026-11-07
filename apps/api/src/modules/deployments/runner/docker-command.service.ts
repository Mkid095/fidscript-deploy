import { Injectable } from '@nestjs/common';
import { execSync, execFileSync } from 'child_process';

/**
 * Low-level Docker/shell command execution + container health probing.
 *
 * Extracted from DockerRunService so deploy + rollback share one source of
 * truth for "how we talk to the host Docker daemon".
 */
@Injectable()
export class DockerCommandService {
  /** Run a shell command string (used for simple piped commands like `docker logs … | tail`). */
  exec(cmd: string): string {
    try {
      return execSync(cmd, { timeout: 60_000, stdio: 'pipe' } as any).toString();
    } catch (err) {
      throw new Error(extractMsg(err));
    }
  }

  /**
   * Spawn `docker` with NO shell so Traefik labels (Host(`domain`) — backticks
   * + parens) and `-e` env-var values pass through verbatim. Joining into a
   * string and using execSync would let /bin/sh interpret Host(`...`) and fail
   * with "Syntax error: ( unexpected".
   */
  execDocker(args: string[]): string {
    try {
      return execFileSync('docker', args, { timeout: 60_000, stdio: 'pipe' } as any).toString();
    } catch (err) {
      throw new Error(extractMsg(err));
    }
  }

  /**
   * Probe the deployed container's HTTP health from THIS api container over the
   * shared fidscript-app network, using the target's resolved IP. We must NOT
   * `docker exec curl` into the user's image — many images (alpine, distroless)
   * don't include curl, which would report a false-negative health failure.
   */
  async waitForHealth(containerName: string, healthCheckPath: string, port: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const status = this.exec(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).trim();
        if (status !== 'true') return false;
        const ip = this.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' ${containerName} 2>/dev/null`).trim().split(' ')[0];
        if (ip) {
          const code = this.exec(`curl -sf -m 3 -o /dev/null -w '%{http_code}' http://${ip}:${port}${healthCheckPath} 2>/dev/null || true`).trim();
          if (code === '200' || code.startsWith('3')) return true;
        }
      } catch { /* not ready yet */ }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
  }
}

function extractMsg(err: unknown): string {
  const e = err as { message?: string; stderr?: Buffer | string };
  return typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || e.message || String(err);
}
