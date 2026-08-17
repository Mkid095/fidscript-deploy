/**
 * CLI storage — read commands (list-buckets, list-files). Imported by storage.ts.
 */
import { Command } from 'commander';
import {
  BucketRow,
  CliContext,
  findBucketId,
  loadSdk,
  printTable,
} from './storage-helpers';
import { die } from './storage-helpers';

export function addStorageReadCommands(
  storage: Command,
  ctx: CliContext,
  cfg: ReturnType<CliContext['loadConfig']>,
  output: string,
): void {
  storage
    .command('list-buckets')
    .alias('buckets')
    .description('List storage buckets in a project')
    .option('-p, --project <id>', 'Project ID')
    .action(async function (this: Command, opts: { project?: string }) {
      const sdk = await loadSdk(ctx);
      const parentProject = this.parent?.opts()?.project;
      const projectId = (opts.project || parentProject) || die('No project ID (--project)');
      try {
        const buckets = (await sdk.storage.listBuckets(projectId)) as unknown as BucketRow[];
        const rows = buckets.map(b => ({
          name: b.name,
          provider: b.provider,
          region: b.region ?? '—',
          public: b.isPublic ? '✓' : '✗',
          id: b.id?.slice(0, 12),
        }));
        await printTable(rows, output);
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  storage
    .command('list-files <bucketName>')
    .description('List files in a bucket')
    .option('-p, --project <id>', 'Project ID')
    .option('--prefix <prefix>', 'Key prefix filter')
    .action(async function (this: Command, bucketName: string, opts: { project?: string; prefix?: string }) {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? this.parent?.opts()?.project ?? die('No project ID (--project)');
      try {
        const bucketId = await findBucketId(sdk, projectId, bucketName);
        const res = await sdk.storage.listFiles(projectId, bucketId, { prefix: opts.prefix }) as unknown as { files: Array<{ key: string; sizeBytes: number; createdAt: string }> };
        const rows = res.files.map(f => ({ key: f.key, size: f.sizeBytes, modified: f.createdAt }));
        await printTable(rows, output);
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });
}
