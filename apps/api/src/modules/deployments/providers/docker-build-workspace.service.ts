import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DockerBuildWorkspaceService {
  constructor(private config: ConfigService) {}

  prepareWorkspace(): string {
    const ws = `/tmp/fidscript-build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(ws, { recursive: true });
    return ws;
  }

  cleanupWorkspace(ws: string): void {
    try { rmSync(ws, { recursive: true, force: true }); } catch { /* ignore */ }
  }

 async fetchGitSource(opts: {
  url: string;
  branch: string;
  credentials?: string;
  workspace: string;
}): Promise<void> {
  const { url, branch, credentials, workspace } = opts;

  try {
    // Build the clone URL. When credentials are provided, embed them directly
    // so that git never has to prompt interactively (which would fail in a
    // non-TTY server environment and cause a 500).
    let cloneUrl = url;
    if (credentials) {
      const [user, token] = credentials.includes(':')
        ? credentials.split(':')
        : ['', credentials];
      const parsed = new URL(url);
      cloneUrl = `${parsed.protocol}//${user}:${token}@${parsed.host}${parsed.pathname}`;
    }

    // depth=5 ensures we get enough history for config files that may have been
    // added in recent but not-necessarily-the-latest commit. depth=1 often misses
    // files added in the tip commit when the tip is a merge commit.
    const cloneCmd = `git clone --depth=5 --branch "${branch}" "${cloneUrl}" "${workspace}"`;
    this.exec(cloneCmd);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Git clone failed: ${msg}`);
  }
}

  /**
   * Download an archive (zip/tar.gz) from object storage and extract it into
   * the build workspace. Uses the `mc` (MinIO client) CLI if available, falling
   * back to `curl` against the MinIO HTTP endpoint with path-style addressing.
   *
   * The archive is extracted with strip-components=0 (preserving the archive's
   * internal layout). A nested top-level directory is NOT created — the
   * workspace itself becomes the build context root.
   */
  async fetchArchiveSource(opts: {
    bucketId: string;
    objectKey: string;
    workspace: string;
  }): Promise<void> {
    const { bucketId, objectKey, workspace } = opts;

    // Resolve the archive format from the object key extension.
    const ext = objectKey.toLowerCase();
    const isZip = ext.endsWith('.zip');
    const isTar = ext.endsWith('.tar.gz') || ext.endsWith('.tgz') || ext.endsWith('.tar');
    if (!isZip && !isTar) {
      throw new Error(`Unsupported archive format: ${objectKey}. Use .zip, .tar.gz, or .tar.`);
    }

    const archivePath = join(workspace, `source-${Date.now()}${isZip ? '.zip' : '.tar.gz'}`);

    try {
      // The bucket ID is the actual bucket name in MinIO. Download via HTTP
      // (path-style) using the configured internal endpoint + credentials.
      // This avoids a hard dependency on the `mc` CLI being installed.
      const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'minio:9000');
      const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
      const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin');
      const scheme = 'http';
      const [host, port = '9000'] = endpoint.replace(/^https?:\/\//, '').split(':');
      const downloadUrl = `${scheme}://${host}:${port}/${bucketId}/${objectKey}`;

      // Use curl with HTTP basic auth (MinIO accepts basic auth for reads).
      this.exec(
        `curl -fsS -u "${accessKey}:${secretKey}" -o "${archivePath}" "${downloadUrl}"`,
        { timeout: 300_000 },
      );

      if (!existsSync(archivePath)) {
        throw new Error(`Archive download produced no file at ${archivePath}`);
      }

      // Extract into the workspace root.
      if (isZip) {
        this.exec(`unzip -o -q "${archivePath}" -d "${workspace}"`, { timeout: 120_000 });
      } else {
        this.exec(`tar -xzf "${archivePath}" -C "${workspace}"`, { timeout: 120_000 });
      }
    } catch (err) {
      throw new Error(`Archive fetch/extract failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Remove the downloaded archive to keep the build context clean.
      try { rmSync(archivePath, { force: true }); } catch { /* ignore */ }
    }
  }

  exec(cmd: string, opts?: { timeout?: number; env?: Record<string, string> }): string {
    try {
      return execSync(cmd, {
        timeout: opts?.timeout ?? 300_000,
        stdio: 'pipe',
        env: { ...process.env, DOCKER_BUILDKIT: '1', ...opts?.env },
      } as any).toString();
    } catch (err) {
      const e = err as { message?: string; stderr?: Buffer | string };
      const msg = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || e.message || String(err);
      throw new Error(msg);
    }
  }
}
