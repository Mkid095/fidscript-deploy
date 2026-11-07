/**
 * CLI queues — read commands (list, get). Imported by queues.ts.
 */
import { Command } from 'commander';
import {
  CliContext,
  QueueRow,
  QueueStats,
  die,
  loadSdk,
  printTable,
} from './queue-helpers';

export function addQueueReadCommands(
  queues: Command,
  ctx: CliContext,
  cfg: ReturnType<CliContext['loadConfig']>,
  output: string,
): void {
  queues
    .command('list')
    .description('List queues in a project')
    .action(async function (this: Command, opts: { project?: string }) {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? this.parent?.opts()?.project ?? die('No project ID (--project)');
      try {
        const items = (await sdk.queues.list(projectId)) as unknown as QueueRow[];
        let depth: Record<string, number> = {};
        try {
          const stats = await Promise.all(items.map(async (q) => ({ id: q.id, s: await sdk.queues.getStats(projectId, q.id) as unknown as QueueStats })));
          depth = Object.fromEntries(stats.map(s => [s.id, s.s.jsDepth]));
        } catch { /* stats are best-effort */ }
        const rows = items.map(q => ({
          name: q.name,
          type: q.type,
          retention: `${q.retentionDays}d`,
          depth: depth[q.id] ?? 0,
          status: q.status,
        }));
        await printTable(rows, output);
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  queues
    .command('get <queueId>')
    .description('Get a queue by ID (with current stats)')
    .action(async function (this: Command, queueId: string, opts: { project?: string }) {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? this.parent?.opts()?.project ?? die('No project ID (--project)');
      try {
        const q = await sdk.queues.get(projectId, queueId) as unknown as QueueRow;
        const s = await sdk.queues.getStats(projectId, queueId) as unknown as QueueStats;
        console.log(`Name:           ${q.name}`);
        console.log(`ID:             ${q.id}`);
        console.log(`Type:           ${q.type}`);
        console.log(`Status:         ${q.status}`);
        console.log(`Retention:      ${q.retentionDays} day(s)`);
        console.log(`Max messages:   ${q.maxMessages}`);
        console.log(`Created:        ${q.createdAt}`);
        console.log('Stats:');
        console.log(`  depth (JS):   ${s.jsDepth}`);
        console.log(`  pending:      ${s.pending}`);
        console.log(`  delivered:    ${s.delivered}`);
        console.log(`  acknowledged: ${s.acknowledged}`);
        console.log(`  failed:       ${s.failed}`);
        console.log(`  dead-letter:  ${s.deadLettered}`);
        console.log(`  total:        ${s.total}`);
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });
}
