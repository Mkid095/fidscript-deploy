/**
 * CLI storage — write commands (create-bucket, upload, delete-bucket).
 * Imported by storage.ts.
 */
import { Command } from 'commander';
import { readFileSync, statSync } from 'fs';
import { basename } from 'path';
import {
  BucketRow,
  CliContext,
  confirmDelete,
  findBucketId,
  loadSdk,
} from './storage-helpers';
import { die } from './storage-helpers';

export function addStorageWriteCommands(storage: Command, ctx: CliContext): void {
  storage
    .command('create-bucket <name>')
    .description('Create a storage bucket')
    .option('-p, --project <id>', 'Project ID')
    .option('--provider <provider>', 'Storage provider (default: internal)', 'internal')
    .option('--region <region>', 'Region (accepted but currently ignored by the API)')
    .option('--public', 'Make the bucket public', false)
    .action(async (name: string, opts: { project?: string; provider?: string; region?: string; public?: boolean }) => {
      if (opts.region) console.warn('Note: --region is accepted but not stored by the current API (Bucket.region is provider-driven).');
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const b = await sdk.storage.createBucket(projectId, name, opts.provider ?? 'internal') as unknown as BucketRow;
        console.log(`✓ Created bucket ${b.id}: ${b.name} (provider: ${b.provider}, public: ${b.isPublic ? 'yes' : 'no'})`);
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  storage
    .command('upload <bucketName> <fileKey> <localPath>')
    .description('Upload a local file to a bucket')
    .option('-p, --project <id>', 'Project ID')
    .action(async (bucketName: string, fileKey: string, localPath: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const bucketId = await findBucketId(sdk, projectId, bucketName);
        const stat = statSync(localPath);
        if (!stat.isFile()) die(`Not a file: ${localPath}`);
        const buffer = readFileSync(localPath);
        const f = await sdk.storage.uploadFile(projectId, bucketId, buffer, basename(localPath), { key: fileKey }) as unknown as { id: string; key: string; sizeBytes: number; etag: string };
        console.log(`✓ Uploaded ${f.id} (${f.sizeBytes} bytes) to ${bucketName}/${f.key} [etag ${f.etag}]`);
      } catch (e) { die(`Upload failed: ${(e as Error).message}`); }
    });

  storage
    .command('delete-bucket <name>')
    .description('Delete an empty bucket (prompts for confirmation)')
    .option('-p, --project <id>', 'Project ID')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (name: string, opts: { project?: string; yes?: boolean }) => {
      if (!opts.yes && !(await confirmDelete(`Delete bucket ${name}? It must be empty. [y/N] `))) {
        console.log('Cancelled.');
        return;
      }
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const bucketId = await findBucketId(sdk, projectId, name);
        await sdk.storage.deleteBucket(projectId, bucketId);
        console.log(`✓ Deleted bucket ${name}`);
      } catch (e) { die(`Delete failed: ${(e as Error).message}`); }
    });
}
