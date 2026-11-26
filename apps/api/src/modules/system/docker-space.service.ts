/**
 * DockerSpaceService — where the machine's disk actually goes, and the
 * hands that safely get some back.
 *
 * The rule that shapes everything here: only reclaim what the daemon
 * itself calls reclaimable. On a containerd-backed host the "build cache"
 * is the shared layer store behind the running images — the daemon marks
 * it 0B reclaimable, and forcing it would take the live sites down. The
 * reclaim ladder therefore touches, in order:
 *
 *   1. `docker system prune -f` — dangling images, stopped/created
 *      containers, unused networks. Never in-use anything.
 *   2. `docker builder prune -f` — build cache entries no image or build
 *      references. (The 6-hour deployment GC already runs the aggressive
 *      `--all` variant; the manual button sticks to the conservative set.)
 *
 * What it never does: prune volumes, prune tagged images, stop or remove
 * running containers. The GC's rollback-retained images are data.
 */
import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';

export interface SpaceDisk {
  used: number;
  total: number;
  usedPercent: number;
}

export interface SpaceCategory {
  total: number;
  reclaimable: number;
}

export interface SpaceReport {
  disk: SpaceDisk;
  docker: {
    images: SpaceCategory;
    buildCache: SpaceCategory;
    containers: SpaceCategory;
    volumes: SpaceCategory;
  };
  at: string;
}

export interface ReclaimResult {
  /** The truth: root filesystem usage before minus after. */
  reclaimedBytes: number;
  steps: string[];
  report: SpaceReport;
}

@Injectable()
export class DockerSpaceService {
  private readonly logger = new Logger(DockerSpaceService.name);

  /**
   * The machine's disk, plus what the Docker daemon reports per category.
   *
   * The daemon is the source of truth for its own space — `docker system
   * df` is the same number the operator sees, including its honest
   * "reclaimable" column.
   */
  report(): SpaceReport {
    const disk = this.readDisk();
    const docker = this.readDockerSpace();
    return { disk, docker, at: new Date().toISOString() };
  }

  /**
   * Reclaim what is actually reclaimable, and measure it against the
   * machine's own disk — the only number the operator cares about.
   */
  reclaim(): ReclaimResult {
    const before = this.readDisk();
    const steps: string[] = [];

    const run = (step: string, cmd: string, timeoutMs = 300_000): void => {
      try {
        const out = execSync(cmd, { timeout: timeoutMs, stdio: 'pipe' }).toString().trim();
        steps.push(`${step} — ${out.split('\n').pop() || 'done'}`);
      } catch (err) {
        // A step failing must not stop the rest: each is independent, and
        // the measurement below says what the whole pass actually did.
        this.logger.warn(`Space step "${step}" failed: ${err instanceof Error ? err.message : String(err)}`);
        steps.push(`${step} — failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    run('dangling images, stopped containers, unused networks', 'docker system prune -f');
    run('the build cache nothing references', 'docker builder prune -f');

    const after = this.readDisk();
    const result: ReclaimResult = {
      reclaimedBytes: Math.max(0, before.used - after.used),
      steps,
      report: this.report(),
    };
    this.logger.log(
      `[space] reclaim freed ${Math.round(result.reclaimedBytes / 1024 ** 2)}MB; disk now ${result.report.disk.usedPercent}%`,
    );
    return result;
  }

  /** Root filesystem usage — the machine's disk, in bytes. */
  private readDisk(): SpaceDisk {
    try {
      const lines = execSync('df -B1 -P /', { timeout: 5000, stdio: 'pipe' })
        .toString()
        .split('\n');
      const cols = (lines[1] ?? '').trim().split(/\s+/);
      const total = Number(cols[1] ?? 0);
      const used = Number(cols[2] ?? 0);
      return { used, total, usedPercent: total ? Math.round((used / total) * 100) : 0 };
    } catch {
      return { used: 0, total: 0, usedPercent: 0 };
    }
  }

  /**
   * `docker system df --format '{{json .}}'` — one JSON line per category:
   * {"Type":"Images","Total":28,"Active":27,"Size":"15.09GB","Reclaimable":"1.159GB (7%)"}.
   * The sizes are Docker's own human units, so they are read back with
   * Docker's own unit table.
   */
  private readDockerSpace(): SpaceReport['docker'] {
    const out: { images: SpaceCategory; buildCache: SpaceCategory; containers: SpaceCategory; volumes: SpaceCategory } = {
      images: { total: 0, reclaimable: 0 },
      buildCache: { total: 0, reclaimable: 0 },
      containers: { total: 0, reclaimable: 0 },
      volumes: { total: 0, reclaimable: 0 },
    };
    try {
      const lines = execSync("docker system df --format '{{json .}}'", { timeout: 15_000, stdio: 'pipe' })
        .toString()
        .split('\n')
        .filter(Boolean);
      for (const line of lines) {
        const row = JSON.parse(line) as { Type: string; Size: string; Reclaimable: string };
        const category =
          row.Type === 'Images'
            ? out.images
            : row.Type === 'Build Cache'
              ? out.buildCache
              : row.Type === 'Containers'
                ? out.containers
                : row.Type === 'Local Volumes'
                  ? out.volumes
                  : null;
        if (!category) continue;
        category.total = dockerBytes(row.Size);
        category.reclaimable = dockerBytes(row.Reclaimable);
      }
    } catch (err) {
      this.logger.warn(`Could not read the docker space report: ${err instanceof Error ? err.message : String(err)}`);
    }
    return out;
  }
}

/**
 * "1.159GB", "0B", "1.159GB (7%)" → bytes.
 * Docker's `system df` sizes use decimal units with an optional percent
 * suffix on the reclaimable column.
 */
function dockerBytes(value: string): number {
  const match = (value ?? '').match(/^([\d.]+)\s*([A-Za-z]+)/);
  if (!match) return 0;
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
  return Number.parseFloat(match[1]) * (units[match[2]] ?? 1);
}
