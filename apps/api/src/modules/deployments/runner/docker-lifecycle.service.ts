import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { execSync } from 'child_process';

/**
 * DockerLifecycleService — low-level Docker container + image operations.
 *
 * All exec calls use a 60s timeout and pipe stdio (no TTY hang).
 */
@Injectable()
export class DockerLifecycleService implements OnModuleDestroy {
  private readonly logger = new Logger(DockerLifecycleService.name);
  private readonly APP_NETWORK = 'fidscript-app';

  /** Remove a container (force, including volumes). */
  async teardown(containerName: string): Promise<void> {
    try { this.exec(`docker rm -f ${containerName}`); } catch { /* already gone */ }
  }

  /** Remove a Docker image by tag. Safe to call if already removed. */
  async removeImage(imageTag: string): Promise<void> {
    try {
      this.exec(`docker rmi ${imageTag} 2>/dev/null || true`);
      this.logger.log(`Removed image ${imageTag}`);
    } catch { /* ignore — image may be referenced by another container */ }
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

  /**
   * Garbage-collect old deployment images and build cache.
   * Called periodically by DeploymentGcService.
   *
   * Strategy:
   *  1. Remove images with the `fidscript/` prefix that are NOT referenced
   *     by any running container (keeps the active deployment's image).
   *  2. Prune dangling images (untagged layers from failed builds).
   *  3. Prune BuildKit cache older than the retention window.
   *  4. Prune stopped containers older than 1 hour (orphans from failed deploys).
   */
  gc(keepImages: string[] = [], pruneBuildCache = true): { imagesFreed: number; cacheFreedMB: number } {
    let imagesFreed = 0;
    let cacheFreedMB = 0;

    // 1. Remove unreferenced fidscript/* images (keep the active ones)
    try {
      const allImages = this.exec(
        `docker images --filter "reference=fidscript/*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null`,
      ).trim();
      if (allImages) {
        const images = allImages.split('\n').map(s => s.trim()).filter(Boolean);
        for (const img of images) {
          if (keepImages.includes(img)) continue;
          // Check if any running container uses this image
          const inUse = this.exec(
            `docker ps --filter "ancestor=${img}" --format "{{.ID}}" 2>/dev/null`,
          ).trim();
          if (!inUse) {
            try {
              this.exec(`docker rmi ${img} 2>/dev/null`);
              imagesFreed++;
            } catch { /* image may have dependent layers */ }
          }
        }
      }
    } catch (e) {
      this.logger.warn(`GC image sweep failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 2. Prune dangling images
    try {
      this.execWithTimeout(`docker image prune -f 2>/dev/null || true`, 120_000);
    } catch { /* ignore */ }

    // 3. Prune BuildKit cache (the biggest disk consumer — needs longer timeout)
    if (pruneBuildCache) {
      try {
        const before = this.getBuildCacheSizeMB();
        // Use a 5-minute timeout for cache pruning (can be slow with 25+ GB)
        this.execWithTimeout(`docker builder prune -f --all 2>/dev/null || true`, 300_000);
        const after = this.getBuildCacheSizeMB();
        cacheFreedMB = Math.max(0, before - after);
      } catch (e) {
        this.logger.warn(`GC build cache prune failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 4. Prune stopped containers older than 1 hour (orphans from failed deploys)
    try {
      this.execWithTimeout(`docker container prune -f --filter "until=1h" 2>/dev/null || true`, 60_000);
    } catch { /* ignore */ }

    if (imagesFreed > 0 || cacheFreedMB > 0) {
      this.logger.log(`GC: freed ${imagesFreed} image(s), ${cacheFreedMB}MB build cache`);
    }
    return { imagesFreed, cacheFreedMB };
  }

  /** Get the current BuildKit cache size in MB (approximate). */
  private getBuildCacheSizeMB(): number {
    try {
      const output = this.exec(`docker buildx du --format "{{.Size}}" 2>/dev/null || echo "0"`);
      // Parse total from buildx du output — it prints per-record sizes
      // Fall back to docker system df for a rough estimate
      const dfOutput = this.exec(`docker system df --format "{{.Type}} {{.Size}}" 2>/dev/null`);
      const buildLine = dfOutput.split('\n').find(l => l.includes('Build Cache'));
      if (buildLine) {
        const sizeStr = buildLine.split(/\s+/).pop() || '0';
        return this.parseSizeToMB(sizeStr);
      }
    } catch { /* ignore */ }
    return 0;
  }

  private parseSizeToMB(s: string): number {
    const num = parseFloat(s);
    if (s.includes('GB')) return Math.round(num * 1024);
    if (s.includes('MB')) return Math.round(num);
    if (s.includes('kB') || s.includes('KB')) return Math.round(num / 1024);
    return Math.round(num / (1024 * 1024));
  }

  private exec(cmd: string): string {
    return this.execWithTimeout(cmd, 60_000);
  }

  /** Execute a command with a custom timeout (for long-running GC operations). */
  private execWithTimeout(cmd: string, timeoutMs: number): string {
    try {
      return execSync(cmd, { timeout: timeoutMs, stdio: 'pipe' } as any).toString();
    } catch (err) {
      const e = err as { message?: string; stderr?: Buffer | string };
      const msg = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || e.message || String(err);
      throw new Error(msg);
    }
  }

  OnModuleDestroy() {
    // No-op — stateless service
  }

  onModuleDestroy() {
    // Required by interface, no-op
  }
}

