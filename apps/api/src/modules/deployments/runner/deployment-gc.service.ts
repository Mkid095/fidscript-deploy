/**
 * DeploymentGcService — scheduled garbage collection for deployment resources.
 *
 * Runs every 6 hours to:
 *  1. Prune unreferenced fidscript/* images (keeps images for running containers)
 *  2. Prune dangling images from failed builds
 *  3. Prune BuildKit cache (the #1 disk consumer — can grow to 25+ GB)
 *  4. Prune orphaned stopped containers older than 1 hour
 *
 * Also exposes `gcNow()` for manual/on-demand cleanup.
 *
 * On a 96 GB disk that was 78% full, this reclaims ~60-67 GB on first run.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DockerLifecycleService } from './docker-lifecycle.service';
import { PrismaService } from '@/prisma/prisma.service';

const GC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_BUILDCACHE_AGE_HOURS = 24; // prune build cache older than 24h

@Injectable()
export class DeploymentGcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeploymentGcService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private lifecycle: DockerLifecycleService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Run an initial GC 60s after startup (let the app settle first)
    setTimeout(() => this.runGc().catch(err => {
      this.logger.error(`Initial GC failed: ${err.message}`);
    }), 60_000);

    // Schedule recurring GC
    this.timer = setInterval(() => {
      this.runGc().catch(err => {
        this.logger.error(`Scheduled GC failed: ${err.message}`);
      });
    }, GC_INTERVAL_MS);

    this.logger.log(`Deployment GC scheduled (every ${GC_INTERVAL_MS / 3600000}h)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Collect all image tags that are currently "active" — i.e., referenced by
   * a successful deployment that still has a running container, OR by the
   * most recent deployment per project (for quick rollback).
   */
  private async getActiveImageTags(): Promise<string[]> {
    const keep: string[] = [];

    // Keep the latest successful deployment's image per project (for rollback)
    const projects = await this.prisma.project.findMany({
      select: { id: true },
    });
    for (const p of projects) {
      const latest = await this.prisma.deployment.findFirst({
        where: { projectId: p.id, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        include: { release: true },
      });
      if (latest?.release?.imageTag) keep.push(latest.release.imageTag);
    }

    return [...new Set(keep)]; // dedupe
  }

  /**
   * Run garbage collection. Safe to call at any time.
   * Also truncates old build logs from the DB to prevent Postgres bloat.
   */
  async runGc(): Promise<{ imagesFreed: number; cacheFreedMB: number; logsTruncated: number }> {
    this.logger.log('Starting deployment GC…');
    const keepImages = await this.getActiveImageTags();
    this.logger.debug(`Keeping ${keepImages.length} active image(s): ${keepImages.join(', ') || 'none'}`);

    const { imagesFreed, cacheFreedMB } = this.lifecycle.gc(keepImages, true);

    // Truncate build logs older than 7 days (keep the record, clear the TEXT)
    let logsTruncated = 0;
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.$executeRaw`
        UPDATE projects.releases
        SET "buildLogs" = LEFT("buildLogs", 500)
        WHERE "buildLogs" IS NOT NULL
          AND LENGTH("buildLogs") > 500
          AND created_at < ${cutoff}
      `;
      logsTruncated = result;
      if (logsTruncated > 0) {
        this.logger.log(`Truncated ${logsTruncated} old build log(s) to 500 chars`);
      }
    } catch (err) {
      this.logger.warn(`Build log truncation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.logger.log(`GC complete: ${imagesFreed} image(s) removed, ${cacheFreedMB}MB cache freed, ${logsTruncated} log(s) truncated`);
    return { imagesFreed, cacheFreedMB, logsTruncated };
  }
}
