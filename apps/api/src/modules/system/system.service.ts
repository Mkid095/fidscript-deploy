import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { PrismaService } from '@/prisma/prisma.service';
import { DeploymentTeardownService } from '@/modules/deployments/services/deployment-teardown.service';

/**
 * What the machine is running, and what each of them is using.
 *
 * The numbers come from the Docker daemon itself — the same source the
 * deployment engine uses — so the console shows what is true rather than
 * what a collector on the host happened to scrape.
 */

export interface ContainerStat {
  name: string;
  image: string;
  status: string;
  /** A share of a core, as a percentage. */
  cpuPercent: number;
  /** The memory it is holding, in bytes. */
  memoryBytes: number;
  /** A share of the memory it is allowed, as a percentage. */
  memoryPercent: number;
  /** The network it carried, in bytes. */
  networkBytes: number;
}

export interface SiteTraffic {
  /** The host the request came for. */
  site: string;
  /** How many requests it carried. */
  requests: number;
  /** How many of them did not succeed. */
  errors: number;
}

export interface DiskState {
  /** The bytes used on the machine's own filesystem. */
  used: number;
  /** The bytes it has. */
  total: number;
}

export interface SystemState {
  containers: ContainerStat[];
  disk: DiskState;
  /** When the numbers were read. */
  at: string;
}

const CACHE_MS = 5_000;

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private cached: { state: SystemState; at: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private teardown: DeploymentTeardownService,
  ) {}

  /**
   * The deletion cleanups that are not finished: a failed one (and what
   * failed), or one still running past its stall window. This is the
   * operator's queue for "a project was deleted but its surface did not
   * come down", and a press to retry is one call away.
   */
  async deletionTasks(): Promise<
    Array<{
      projectId: string;
      projectSlug: string | null;
      state: string;
      lastError: string | null;
      attempts: number;
      updatedAt: string;
    }>
  > {
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    const tasks = await this.prisma.projectDeletionTask.findMany({
      where: {
        OR: [
          { state: 'CLEANUP_FAILED' },
          { state: 'IN_PROGRESS', updatedAt: { lt: staleBefore } },
        ],
      },
      include: { project: { select: { slug: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return tasks.map((t) => ({
      projectId: t.projectId,
      projectSlug: t.project?.slug ?? null,
      state: t.state,
      lastError: t.lastError,
      attempts: t.attempts,
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /** Re-run the cleanup for a failed task. Idempotent — the finished steps are recorded. */
  async retryDeletion(projectId: string): Promise<void> {
    await this.teardown.retry(projectId);
  }

  /**
   * The containers, with what they are using.
   *
   * `docker stats` samples twice, so it takes a moment — the answer is
   * held for a few seconds, because a page that asks twice does not need
   * the machine to be asked twice.
   */
  /**
   * The traffic each site carried.
   *
   * It is counted from the edge's own access log — the requests that
   * reached the platform, and which host they came for. That is the answer
   * to "how much traffic is this site getting".
   */
  async traffic(since = '1h'): Promise<SiteTraffic[]> {
    const counts = new Map<string, SiteTraffic>();

    try {
      const output = execFileSync(
        'docker',
        ['logs', '--since', since, '--tail', '50000', 'fidscript_traefik'],
        { timeout: 20_000, stdio: 'pipe' } as any,
      ).toString();

      for (const line of output.split('\n')) {
        if (!line.trim().startsWith('{')) continue;
        try {
          const entry = JSON.parse(line) as {
            RequestHost?: string;
            DownstreamStatus?: number;
          };
          const site = entry.RequestHost;
          if (!site) continue;

          const current = counts.get(site) ?? { site, requests: 0, errors: 0 };
          current.requests += 1;
          if ((entry.DownstreamStatus ?? 0) >= 400) current.errors += 1;
          counts.set(site, current);
        } catch {
          // A line that is not JSON is not a request.
        }
      }
    } catch (err) {
      this.logger.warn(`Could not read the access log: ${(err as Error).message}`);
    }

    return [...counts.values()].sort((a, b) => b.requests - a.requests);
  }

  async state(): Promise<SystemState> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) {
      return this.cached.state;
    }

    const containers = this.read();
    const state: SystemState = {
      containers,
      disk: this.readDisk(),
      at: new Date().toISOString(),
    };
    this.cached = { state, at: Date.now() };
    return state;
  }

  /**
   * The machine's own filesystem.
   *
   * The API container's root is the machine's root, so `df` here is the
   * machine's disk — which is what the operator is asking about.
   */
  private readDisk(): DiskState {
    try {
      const output = execFileSync('df', ['-B1', '/'], { timeout: 5000, stdio: 'pipe' } as any)
        .toString()
        .split('\n');
      const columns = (output[1] ?? '').trim().split(/\s+/);
      const total = Number(columns[1] ?? 0);
      const used = Number(columns[2] ?? 0);
      return { used, total };
    } catch {
      return { used: 0, total: 0 };
    }
  }

  private read(): ContainerStat[] {
    let stats: Map<string, { cpu: string; memory: string; memoryPercent: string; net: string }>;

    try {
      const output = execFileSync(
        'docker',
        ['stats', '--no-stream', '--format', '{{json .}}'],
        { timeout: 20_000, stdio: 'pipe' } as any,
      ).toString();

      stats = new Map(
        output
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as Record<string, string>)
          .map((entry) => [
            entry.Name,
            {
              cpu: entry.CPUPerc,
              memory: entry.MemUsage,
              memoryPercent: entry.MemPerc,
              net: entry.NetIO,
            },
          ]),
      );
    } catch (err) {
      this.logger.warn(`Could not read the container stats: ${(err as Error).message}`);
      stats = new Map();
    }

    try {
      const output = execFileSync(
        'docker',
        ['ps', '--format', '{{json .}}'],
        { timeout: 15_000, stdio: 'pipe' } as any,
      ).toString();

      return output
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, string>)
        .map((entry) => {
          const stat = stats.get(entry.Names);
          return {
            name: entry.Names,
            image: entry.Image,
            status: entry.Status,
            cpuPercent: percent(stat?.cpu),
            memoryBytes: bytes(stat?.memory),
            memoryPercent: percent(stat?.memoryPercent),
            networkBytes: bytes(stat?.net),
          };
        })
        .sort((a, b) => b.memoryBytes - a.memoryBytes);
    } catch (err) {
      this.logger.warn(`Could not read the containers: ${(err as Error).message}`);
      return [];
    }
  }
}

/** "12.34%" → 12.34 */
function percent(value?: string): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * "1.234GiB / 7.7GiB" → the bytes of the first part.
 *
 * The units Docker writes are the ones it uses: B, KiB, MiB, GiB.
 */
function bytes(value?: string): number {
  if (!value) return 0;
  // "685.7MiB / 7.9GiB" — the amount and the unit are not separated by a
  // space, so the shape is read rather than split.
  const match = value.split('/')[0].trim().match(/^([\d.]+)\s*([A-Za-z]+)/);
  if (!match) return 0;

  const parsed = Number.parseFloat(match[1]);
  const unit = match[2];
  if (!Number.isFinite(parsed)) return 0;

  const units: Record<string, number> = {
    B: 1,
    KB: 1000,
    MB: 1000 ** 2,
    GB: 1000 ** 3,
    TB: 1000 ** 4,
    KiB: 1024,
    MiB: 1024 ** 2,
    GiB: 1024 ** 3,
    TiB: 1024 ** 4,
  };

  return parsed * (units[unit ?? 'B'] ?? 1);
}
