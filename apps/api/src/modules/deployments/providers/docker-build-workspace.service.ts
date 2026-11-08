import { Injectable } from '@nestjs/common';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { ShellRunnerService } from '../runner/shell-runner.service';
import { StorageService } from '@/modules/storage/services/storage.service';
import { scrubSecrets } from '../runner/scrub-secrets';

@Injectable()
export class DockerBuildWorkspaceService {
  constructor(
    private config: ConfigService,
    private shell: ShellRunnerService,
    private storage: StorageService,
  ) {}

  prepareWorkspace(): string {
    const ws = `/tmp/fidscript-build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(ws, { recursive: true });
    return ws;
  }

  cleanupWorkspace(ws: string): void {
    try {
      rmSync(ws, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
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
      // non-TTY server environment and cause a 500). HTTPS only: a token on a
      // file:// or ssh:// remote is never valid, and embedding one there both
      // breaks the clone and can carry the credential into an error message.
      let cloneUrl = url;
      if (credentials && url.startsWith('https://')) {
        const [user, token] = credentials.includes(':')
          ? credentials.split(':')
          : ['', credentials];
        const parsed = new URL(url);
        cloneUrl = `${parsed.protocol}//${user}:${token}@${parsed.host}${parsed.pathname}`;
      }

      // depth=5 ensures we get enough history for config files that may have been
      // added in recent but not-necessarily-the-latest commit. depth=1 often misses
      // files added in the tip commit when the tip is a merge commit. (A
      // repository a mounted directory holds may belong to another owner — the
      // image's system gitconfig marks those safe; per-invocation `-c` would be
      // ignored here by design.)
      const cloneCmd = `git clone --depth=5 --branch "${branch}" "${cloneUrl}" "${workspace}"`;
      // Asynchronous: a clone of a large repository takes minutes, and
      // blocking the api for that long stops every other request.
      await this.shell.runStreaming(cloneCmd, () => {}, { timeout: 300_000 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // The command line carries the credential — scrub it before the error
      // goes anywhere a person (or a log) will read it.
      throw new Error(`Git clone failed: ${scrubSecrets(msg)}`);
    }
  }

  /**
   * Download an archive (zip/tar.gz) from object storage and extract it into
   * the build workspace.
   *
   * The archive is extracted with strip-components=0 (preserving the archive's
   * internal layout). A nested top-level directory is NOT created — the
   * workspace itself becomes the build context root.
   */
  async fetchArchiveSource(opts: {
    projectId: string;
    bucketId: string;
    objectKey: string;
    workspace: string;
  }): Promise<void> {
    const { projectId, bucketId, objectKey, workspace } = opts;

    // Resolve the archive format from the object key extension.
    const ext = objectKey.toLowerCase();
    const isZip = ext.endsWith('.zip');
    const isTar =
      ext.endsWith('.tar.gz') || ext.endsWith('.tgz') || ext.endsWith('.tar');
    if (!isZip && !isTar) {
      throw new Error(
        `Unsupported archive format: ${objectKey}. Use .zip, .tar.gz, or .tar.`,
      );
    }

    const archivePath = join(
      workspace,
      `source-${Date.now()}${isZip ? '.zip' : '.tar.gz'}`,
    );

    try {
      // The archive is fetched through the platform's own storage service,
      // which signs the request the way the object store expects.
      //
      // It used to be fetched with `curl -u user:pass`, and the object store
      // answers that with "invalid header: authorization": it speaks AWS
      // signature V4, not HTTP basic auth. Every archive deployment failed
      // at the download.
      const data = await this.storage.downloadFile(
        projectId,
        bucketId,
        objectKey,
      );
      writeFileSync(archivePath, data);

      // Extract into the workspace root.
      if (isZip) {
        await this.shell.runStreaming(
          `unzip -o -q "${archivePath}" -d "${workspace}"`,
          () => {},
          { timeout: 120_000 },
        );
      } else {
        await this.shell.runStreaming(
          `tar -xzf "${archivePath}" -C "${workspace}"`,
          () => {},
          { timeout: 120_000 },
        );
      }
    } catch (err) {
      throw new Error(
        `Archive fetch/extract failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      // Remove the downloaded archive to keep the build context clean.
      try {
        rmSync(archivePath, { force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
