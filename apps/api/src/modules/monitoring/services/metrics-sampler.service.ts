import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * The sampler that makes a project's monitoring page say something.
 *
 * The monitoring tables were written by nothing: an application could be
 * healthy and busy while its project's monitoring screen read zero
 * metrics, for ever. This reads the Docker daemon directly — the same way
 * the deployment engine does — and records each live deployment
 * container's CPU and memory once a minute, so the numbers on the page are
 * measurements, not a zero dressed up as one.
 */
@Injectable()
export class MetricsSamplerService implements OnModuleInit {
  private readonly logger = new Logger(MetricsSamplerService.name);
  private running = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Give the rest of the platform a moment to settle, then sample once
    // soon (so a fresh page is not empty for a minute) and then steady.
    setTimeout(() => {
      void this.sample();
    }, 15_000);
    setInterval(() => {
      void this.sample();
    }, 60_000);
    // The metrics table is a window, not an archive: a day is the horizon
    // the charts read.
    setInterval(() => {
      void this.prune();
    }, 30 * 60_000);
  }

  private docker(args: string[]): string {
    try {
      return execFileSync('docker', args, {
        timeout: 30_000,
        stdio: 'pipe',
      }).toString();
    } catch {
      return '';
    }
  }

  /** "1.4GiB" → bytes. Docker's stats print the size in the friendliest unit;
   *  the metric must be in bytes either way. */
  private parseSize(text: string): number {
    const match = /^(\d+(?:\.\d+)?)\s*([KMGT]i?B?)$/.exec(text.trim());
    if (!match) return NaN;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase().replace('I', '');
    const factor: Record<string, number> = {
      B: 1,
      K: 1024,
      M: 1024 ** 2,
      G: 1024 ** 3,
      T: 1024 ** 4,
    };
    return value * (factor[unit] ?? 1);
  }

  async sample(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const deployments = await this.prisma.deployment.findMany({
        where: { status: 'SUCCESS' },
        select: {
          id: true,
          projectId: true,
          project: { select: { slug: true } },
        },
      });

      for (const deployment of deployments) {
        const container = `fidscript-${deployment.project.slug}-${deployment.id.slice(0, 8)}`;
        const running = this.docker([
          'inspect',
          '-f',
          '{{.State.Running}}',
          container,
        ]).trim();
        if (running !== 'true') continue;

        // docker stats reads the live cgroup numbers: "0.35%  24MiB / 512MiB"
        const line = this.docker([
          'stats',
          '--no-stream',
          '--format',
          '{{.CPUPerc}}|{{.MemUsage}}',
          container,
        ]).trim();
        if (!line.includes('|')) continue;

        const [cpuPart, memPart] = line.split('|');
        const cpu = parseFloat(cpuPart);
        // "24.5MiB / 512MiB" → the used half, in bytes regardless of the
        // unit docker chose to print (KiB, MiB, GiB…).
        const memBytes = this.parseSize(memPart?.split('/')[0] ?? '');
        if (Number.isNaN(cpu) || Number.isNaN(memBytes)) continue;

        const labels = { container, deploymentId: deployment.id };
        await this.prisma.metric.createMany({
          data: [
            {
              projectId: deployment.projectId,
              metric: 'container.cpu_percent',
              value: cpu,
              labels,
            },
            {
              projectId: deployment.projectId,
              metric: 'container.memory_bytes',
              value: memBytes,
              labels,
            },
          ],
        });
      }
    } catch (err) {
      this.logger.warn(
        `[metrics-sampler] sample failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** The metrics window: older than a day goes, once every half hour. */
  async prune(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 24 * 3_600_000);
      const result = await this.prisma.metric.deleteMany({
        where: {
          timestamp: { lt: cutoff },
          metric: { startsWith: 'container.' },
        },
      });
      if (result.count > 0) {
        this.logger.log(
          `[metrics-sampler] pruned ${result.count} old container metrics`,
        );
      }
    } catch {
      /* pruning is housekeeping — never urgent */
    }
  }
}
