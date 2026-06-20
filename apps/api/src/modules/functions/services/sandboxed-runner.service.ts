import { Injectable, Logger } from '@nestjs/common';
import { execSync, execFileSync } from 'child_process';
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

// Bootstrap run inside the container: read the function code from stdin,
// write it to a tmpfs file, require it, and invoke the handler with the event.
// Piping code via stdin avoids bind-mount host-path issues under Docker-out-of-
// Docker (the api container's /tmp is not the daemon host's /tmp).
const NODE_BOOTSTRAP =
  "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{" +
  "require('fs').writeFileSync('/tmp/fn.js',s);" +
  "const h=require('/tmp/fn.js');const e=JSON.parse(process.env.FUNCTION_EVENT||'{}');" +
  "const hp=process.env.FUNCTION_HANDLER||'handler';const fn=hp.includes('.')?hp.split('.').pop():hp;" +
  "const f=(typeof h==='function'?h:(h[fn]||h.handler));" +
  "Promise.resolve(f?f(e):h).then(r=>process.stdout.write(JSON.stringify(r))).catch(err=>{process.stderr.write(String(err&&err.message||err));process.exit(1)})});";

@Injectable()
export class SandboxedRunnerService {
  private readonly logger = new Logger(SandboxedRunnerService.name);

  async run(opts: SandboxedRunOptions): Promise<InvocationResult> {
    const image = RUNTIME_IMAGES[opts.runtime] ?? RUNTIME_IMAGES.nodejs;
    const { code, entryPoint, payload, envVars, memoryMb, timeoutSeconds } = opts;
    const start = Date.now();
    const containerName = `fn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const dockerArgs = [
      'docker', 'run', '--rm', '-i',
      '--name', containerName,
      '--security-opt', 'no-new-privileges', '--cap-drop', 'ALL',
      '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
      '--memory', `${memoryMb}m`, '--memory-swap', `${memoryMb}m`,
      '--cpus', '1', '--pids-limit', '64', '--network', 'none',
      '-e', `FUNCTION_EVENT=${payload}`,
      '-e', `FUNCTION_HANDLER=${entryPoint}`,
      ...Object.entries(envVars).map(([k, v]) => ['-e', `${k}=${v}`]).flat(),
      image,
      ...(opts.runtime === 'python' ? this.pythonCmd() : ['node', '-e', NODE_BOOTSTRAP]),
    ];

    this.pullImage(image);

    try {
      // Spawn docker with NO shell; pipe the function code in via stdin.
      const stdout = execFileSync(dockerArgs[0], dockerArgs.slice(1), {
        input: code,
        timeout: (timeoutSeconds + 5) * 1000,
        stdio: ['pipe', 'pipe', 'pipe'],
        killSignal: 'SIGKILL',
      } as any).toString();
      return { success: true, output: stdout.trim() || 'ok', durationMs: Date.now() - start };
    } catch (err: any) {
      if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        return { success: false, error: `Timed out after ${timeoutSeconds * 1000}ms`, durationMs: Date.now() - start };
      }
      const stderr = err.stderr?.toString() || err.stdout?.toString() || err.message;
      return { success: false, error: stderr, durationMs: Date.now() - start };
    }
  }

  private pythonCmd(): string[] {
    // Python sandbox reads code from stdin, writes it, and invokes handler(event).
    const bootstrap =
      "import sys,json,os;open('/tmp/fn.py','w').write(sys.stdin.read());" +
      "ns={};exec(open('/tmp/fn.py').read(),ns);print(json.dumps(ns['handler'](json.loads(os.environ.get('FUNCTION_EVENT','{}')))))";
    return ['python3', '-c', bootstrap];
  }

  /** Pull image in background if not present — non-blocking for warm paths */
  private pullImage(image: string) {
    try {
      const result = execSync(`docker image inspect ${image} --format '{{.Id}}'`, { stdio: 'pipe' } as any).toString().trim();
      if (result) return; // image exists
    } catch { /* not found */ }

    this.logger.log(`Pulling runtime image: ${image}`);
    execSync(`docker pull ${image}`, { stdio: 'inherit', timeout: 120_000 } as any);
  }
}
