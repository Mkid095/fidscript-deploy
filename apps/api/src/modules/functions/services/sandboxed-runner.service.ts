import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import { InvocationResult } from '@/modules/functions/runtimes/runtime.interface';

export interface SandboxedRunOptions {
  code: string;
  runtime: 'nodejs' | 'python';
  entryPoint: string;
  payload: string;
  envVars: Record<string, string>;
  memoryMb: number;
  timeoutSeconds: number;
}

const RUNTIME_IMAGES = {
  nodejs: 'node:18-alpine',
  python: 'python:3.11-alpine',
};

@Injectable()
export class SandboxedRunnerService {
  private readonly logger = new Logger(SandboxedRunnerService.name);

  constructor(private configService: ConfigService) {}

  async run(opts: SandboxedRunOptions): Promise<InvocationResult> {
    const image = RUNTIME_IMAGES[opts.runtime] ?? RUNTIME_IMAGES.nodejs;
    const { code, runtime, entryPoint, payload, envVars, memoryMb, timeoutSeconds } = opts;
    const start = Date.now();
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const containerName = `fn-${runId}`;

    // Write code to a tmpfs dir — container reads it; nothing lives on the host rootfs
    const hostCodeDir = `/tmp/fidscript-fn/${runId}`;
    let cleanupDone = false;

    const cleanup = async () => {
      if (cleanupDone) return;
      cleanupDone = true;
      try {
        const { rm, mkdir } = await import('fs/promises');
        await rm(hostCodeDir, { recursive: true, force: true });
      } catch { /* ok */ }
    };

    try {
      const { writeFile, mkdir } = await import('fs/promises');
      await mkdir(hostCodeDir, { recursive: true });
      const ext = runtime === 'nodejs' ? 'js' : 'py';
      await writeFile(`${hostCodeDir}/${entryPoint}.${ext}`, code, { mode: 0o444 });

      // Build the docker run command — same pattern as Phase 06 build runner
      const envArg = [
        `FUNCTION_EVENT=${payload}`,
        `FUNCTION_HANDLER=${entryPoint}`,
        ...Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
      ];

      const dockerArgs = [
        'docker', 'run',
        '--name', containerName,
        // Security hardening
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',
        // Read-only rootfs + tmpfs for /tmp
        '--read-only',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
        // Resource limits
        '--memory', `${memoryMb}m`,
        '--memory-swap', `${memoryMb}m`,   // disable swap — OOM on limit
        '--cpus', '1',
        '--pids-limit', '64',
        // No network
        '--network', 'none',
        // Code mounted read-only; /tmp as tmpfs
        '-v', `${hostCodeDir}:/function:ro`,
        // Env
        ...envArg.flatMap(e => ['-e', e]),
        // Image + entrypoint
        image,
        ...this.buildCmd(runtime, entryPoint),
      ];

      this.pullImage(image);

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      try {
        // Use execSync to run docker; collect stdout/stderr separately
        // The container is synchronous — we use a timeout via docker stop
        stdout = execSync(dockerArgs.join(' '), {
          timeout: (timeoutSeconds + 5) * 1000,
          stdio: ['pipe', 'pipe', 'pipe'],
          killSignal: 'SIGKILL',
        } as any).toString();
      } catch (err: any) {
        if (err.stderr) stderr = err.stderr.toString();
        if (err.status != null) exitCode = err.status;
        else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
          // Hard kill already happened via killSignal
          return { success: false, error: `Timed out after ${timeoutSeconds * 1000}ms`, durationMs: Date.now() - start };
        } else if (!stderr) {
          return { success: false, error: err.message, durationMs: Date.now() - start };
        }
      }

      // If we get here, container exited — confirm exit code
      if (exitCode === 0) {
        return { success: true, output: stdout.trim() || 'ok', durationMs: Date.now() - start };
      } else {
        return { success: false, error: stderr || `Exited with code ${exitCode}`, durationMs: Date.now() - start };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sandbox invocation failed: ${msg}`);
      return { success: false, error: msg, durationMs: Date.now() - start };
    } finally {
      // Best-effort container cleanup
      try { execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' } as any); } catch { /* already gone */ }
      await cleanup();
    }
  }

  private buildCmd(runtime: 'nodejs' | 'python', entryPoint: string): string[] {
    if (runtime === 'nodejs') {
      return [
        'node', '-e',
        `const h=require('/function/${entryPoint}.js');const e=JSON.parse(process.env.FUNCTION_EVENT||'{}');const r=(h.handler||h)(e);process.stdout.write(JSON.stringify(r))`,
      ];
    } else {
      return [
        'python3', '-c',
        `import os,json;exec(open('/function/${entryPoint}.py').read());print(json.dumps(handler(json.loads(os.environ.get('FUNCTION_EVENT','{}')))))`,
      ];
    }
  }

  /** Pull image in background if not present — non-blocking for warm paths */
  private pullImage(image: string) {
    try {
      const result = execSync(`docker image inspect ${image} --format '{{.Id}}'`, { stdio: 'pipe' } as any).toString().trim();
      if (result) return; // image exists
    } catch { /* not found */ }

    this.logger.log(`Pulling runtime image: ${image}`);
    // Fire-and-forget — first cold-start will be slow; subsequent calls use cached image
    execSync(`docker pull ${image}`, { stdio: 'inherit', timeout: 120_000 } as any);
  }
}