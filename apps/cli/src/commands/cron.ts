/**
 * CLI commands — cron (scheduled jobs).
 * Mirrors sdk.cron.* methods.
 */
import { Command } from 'commander';
import {
  CliContext,
  die,
  loadSdk,
  printTable,
  confirm,
} from './cron-helpers';
import {
  parseCronSchedule,
  validateCronName,
  validateOptionalUrl,
  parseEnabledFlag,
} from './cron-validate';

export { die, loadSdk };
export type { CliContext };

export function registerCronCommands(program: Command, ctx: CliContext): void {
  const cronCmd = new Command('cron');
  const cfg = ctx.loadConfig();
  const output = (program.opts().output as string) ?? cfg.outputFormat ?? 'table';

  cronCmd
    .command('list')
    .description('List cron jobs in a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const jobs = (await sdk.cron.list(projectId)) as Array<Record<string, unknown>>;
        const rows = jobs.map((j) => ({
          id: typeof j.id === 'string' ? j.id.slice(0, 12) : '',
          name: String(j.name ?? ''),
          schedule: String(j.cronExpression ?? ''),
          enabled: j.enabled ? '✓' : '✗',
          lastRun: j.lastRunAt ? new Date(String(j.lastRunAt)).toLocaleString() : '—',
          nextRun: j.nextRunAt ? new Date(String(j.nextRunAt)).toLocaleString() : '—',
        }));
        await printTable(rows, output);
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  cronCmd
    .command('get <jobId>')
    .description('Get a cron job by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (jobId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const j = (await sdk.cron.get(projectId, jobId)) as Record<string, unknown>;
        const fields: Array<[string, unknown]> = [
          ['Name', j.name], ['ID', j.id], ['Schedule', j.cronExpression],
          ['Timezone', j.timezone], ['Enabled', j.enabled ? '✓' : '✗'], ['State', j.state],
          ['Endpoint', j.endpoint ?? '—'], ['Function ID', j.functionId ?? '—'],
          ['Last run', j.lastRunAt ?? '—'], ['Next run', j.nextRunAt ?? '—'],
        ];
        for (const [k, v] of fields) console.log(`${k.padEnd(12)} ${String(v ?? '')}`);
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });

  cronCmd
    .command('create <name> <schedule>')
    .description('Create a cron job')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--url <url>', 'HTTP endpoint to invoke')
    .option('--enabled', 'Enable the job immediately')
    .action(async (name: string, schedule: string, opts: { project?: string; url?: string; enabled?: boolean }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const parsed = parseCronSchedule(schedule);
      const validatedName = validateCronName(name);
      const endpoint = validateOptionalUrl(opts.url);
      try {
        const j = (await sdk.cron.create(projectId, {
          name: validatedName,
          cronExpression: parsed.raw,
          endpoint,
          enabled: !!opts.enabled,
        })) as Record<string, unknown>;
        console.log(`✓ Created cron job ${String(j.id ?? '')}: ${String(j.name ?? '')} (${String(j.cronExpression ?? '')})`);
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  cronCmd
    .command('update <jobId>')
    .description('Update a cron job')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--name <name>', 'New name')
    .option('--schedule <schedule>', 'New cron expression')
    .option('--enabled <true|false>', 'Enable/disable')
    .action(async (jobId: string, opts: { project?: string; name?: string; schedule?: string; enabled?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const data: Record<string, unknown> = {};
      if (opts.name) data.name = validateCronName(opts.name);
      if (opts.schedule) data.cronExpression = parseCronSchedule(opts.schedule).raw;
      const enabled = parseEnabledFlag(opts.enabled);
      if (enabled !== undefined) data.enabled = enabled;
      try {
        await sdk.cron.update(projectId, jobId, data);
        console.log(`✓ Updated cron job ${jobId}`);
      } catch (e) { die(`Update failed: ${(e as Error).message}`); }
    });

  cronCmd
    .command('delete <jobId>')
    .description('Delete a cron job')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (jobId: string, opts: { project?: string; yes?: boolean }) => {
      const projectId = opts.project ?? die('No project ID (--project)');
      if (!opts.yes && !(await confirm(`Delete cron job ${jobId}? [y/N] `))) {
        console.log('Cancelled.');
        return;
      }
      const sdk = await loadSdk(ctx);
      try {
        await sdk.cron.delete(projectId, jobId);
        console.log(`✓ Deleted cron job ${jobId}`);
      } catch (e) { die(`Delete failed: ${(e as Error).message}`); }
    });

  cronCmd
    .command('trigger <jobId>')
    .description('Trigger a cron job immediately')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (jobId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        await sdk.cron.trigger(projectId, jobId);
        console.log(`✓ Job triggered`);
      } catch (e) { die(`Trigger failed: ${(e as Error).message}`); }
    });

  program.addCommand(cronCmd);
}