/**
 * CLI queues — write commands (create, publish, purge, delete). Imported by queues.ts.
 */
import { Command } from 'commander';
import {
  CliContext,
  QueueRow,
  confirmDelete,
  die,
  loadSdk,
} from './queue-helpers';

export function addQueueWriteCommands(
  queues: Command,
  ctx: CliContext,
): void {
  queues
    .command('create <name>')
    .description('Create a queue')
    .option('-p, --project <id>', 'Project ID')
    .option('--type <type>', 'stream|queue|workqueue', 'stream')
    .option('--retention <hours>', 'Retention in hours (minimum 1)', '168')
    .action(async (name: string, opts: { project?: string; type?: string; retention?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const hours = parseInt(opts.retention ?? '168', 10);
      if (!Number.isFinite(hours) || hours <= 0) die('--retention must be a positive number of hours');
      const retentionDays = Math.max(1, Math.ceil(hours / 24));
      try {
        const q = await sdk.queues.create(projectId, {
          name,
          type: opts.type as 'stream' | 'queue' | 'workqueue' | undefined,
        } as { name: string; type?: 'stream' | 'queue' | 'workqueue' }) as unknown as QueueRow;
        console.log(`✓ Created queue ${q.id}: ${q.name} (type: ${q.type}, retention: ${q.retentionDays}d)`);
        if (q.retentionDays !== retentionDays) {
          console.warn(`Note: requested retention ${retentionDays}d (${hours}h); current SDK queues.create does not accept retentionDays so default ${q.retentionDays}d applies.`);
        }
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  queues
    .command('publish <queueId> <message>')
    .description('Publish a message to a queue (JSON or plain string body)')
    .option('-p, --project <id>', 'Project ID')
    .option('--delay <seconds>', 'Delay in seconds (logged; SDK publish does not transmit it yet)', '0')
    .action(async (queueId: string, message: string, opts: { project?: string; delay?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const delay = parseInt(opts.delay ?? '0', 10);
      if (delay > 0) console.warn(`Note: --delay=${delay}s requested but the current SDK publish path does not transmit delaySeconds. The message will be published immediately.`);
      let body: string | Record<string, unknown> = message;
      try { body = JSON.parse(message); } catch { /* keep as string */ }
      try {
        const res = await sdk.queues.publish(projectId, queueId, body) as unknown as { messageId: string; jsSeq?: number };
        console.log(`✓ Published message ${res.messageId} (seq ${res.jsSeq ?? '—'})`);
      } catch (e) { die(`Publish failed: ${(e as Error).message}`); }
    });

  queues
    .command('purge <queueId>')
    .description('Purge all messages from a queue (prompts for confirmation)')
    .option('-p, --project <id>', 'Project ID')
    .option('--include-dlq', 'Also purge the dead-letter queue', false)
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (queueId: string, opts: { project?: string; includeDlq?: boolean; yes?: boolean }) => {
      if (!opts.yes && !(await confirmDelete(`Purge all messages from queue ${queueId}${opts.includeDlq ? ' (incl. DLQ)' : ''}? [y/N] `))) {
        console.log('Cancelled.');
        return;
      }
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const r = await sdk.queues.purge(projectId, queueId, !!opts.includeDlq) as unknown as { purged: number; dlqPurged: number };
        console.log(`✓ Purged ${r.purged} message(s)${r.dlqPurged ? ` (DLQ: ${r.dlqPurged})` : ''}`);
      } catch (e) { die(`Purge failed: ${(e as Error).message}`); }
    });

  queues
    .command('delete <queueId>')
    .description('Delete a queue (prompts for confirmation)')
    .option('-p, --project <id>', 'Project ID')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (queueId: string, opts: { project?: string; yes?: boolean }) => {
      if (!opts.yes && !(await confirmDelete(`Delete queue ${queueId}? [y/N] `))) { console.log('Cancelled.'); return; }
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        await sdk.queues.delete(projectId, queueId);
        console.log(`✓ Deleted queue ${queueId}`);
      } catch (e) { die(`Delete failed: ${(e as Error).message}`); }
    });
}
