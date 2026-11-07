import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { spawn, type ChildProcess } from 'child_process';

export interface ShellRunOptions {
  /** Kill the command after this many milliseconds. */
  timeout?: number;
  /** Extra environment variables, merged over the process's own. */
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Runs the platform's shell commands — the builds, the clones, the archive
 * extractions — without blocking the API.
 *
 * A `docker build` can run for ten minutes. `execSync` blocks the whole API
 * while it does: every request waits, including the request that is supposed
 * to be watching the build, and the realtime feed that is supposed to be
 * reporting its progress stops.
 *
 * Streaming the output is the other half of it: the operator watches the
 * build as it happens instead of waiting for a wall of text at the end.
 */
@Injectable()
export class ShellRunnerService implements OnModuleDestroy {
  private readonly logger = new Logger(ShellRunnerService.name);
  /** The commands running right now, so a shutdown can stop them. */
  private readonly running = new Set<ChildProcess>();

  /**
   * Run a shell command, streaming its output line by line.
   */
  runStreaming(
    cmd: string,
    onLine: (line: string) => void,
    opts?: ShellRunOptions,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // `detached` puts the command in its own process group, so a timeout
      // can kill the whole group. Killing only the shell is not enough: it
      // leaves the command it started running, and it keeps the output pipes
      // open, so the promise never settles.
      const child = spawn('/bin/sh', ['-c', cmd], {
        env: { ...process.env, DOCKER_BUILDKIT: '1', ...opts?.env },
        cwd: opts?.cwd,
        detached: true,
      });
      this.running.add(child);

      let output = '';
      let settled = false;
      // A chunk can end in the middle of a line, so the tail is held back
      // until the next chunk or the end of the stream.
      let pending = '';

      const timer = opts?.timeout
        ? setTimeout(() => {
            this.logger.warn(`Command timed out after ${opts.timeout}ms: ${cmd}`);
            this.killGroup(child);
          }, opts.timeout)
        : null;

      const consume = (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        pending += text;
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
          if (line) onLine(line);
        }
      };

      child.stdout.on('data', consume);
      child.stderr.on('data', consume);

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        this.running.delete(child);
        reject(err);
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        this.running.delete(child);
        if (pending.trim()) onLine(pending);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed: ${cmd}\n${output}`));
        }
      });
    });
  }

  /**
   * Stop every command that is running.
   *
   * A build outlives the API that started it otherwise — the command is in
   * its own process group, so it survives — and the deployment it belongs to
   * would sit in BUILDING for ever.
   */
  onModuleDestroy(): void {
    for (const child of this.running) {
      this.logger.warn('Stopping a running command — the API is shutting down');
      this.killGroup(child);
    }
    this.running.clear();
  }

  /**
   * Kill a command and everything it started.
   *
   * The negative pid signals the whole process group, which is what a
   * timeout needs: the shell is usually a parent of the command it started,
   * and killing only the parent leaves the command running.
   */
  private killGroup(child: ChildProcess): void {
    try {
      if (child.pid) {
        process.kill(-child.pid, 'SIGKILL');
        return;
      }
    } catch {
      // The group is already gone — fall through to the single process.
    }
    try {
      child.kill('SIGKILL');
    } catch {
      // Already dead.
    }
  }
}
