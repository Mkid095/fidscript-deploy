/**
 * CLI commands — cron (scheduled jobs).
 * Mirrors sdk.cron.* methods.
 */
import { Command } from 'commander';
import { createInterface } from 'readline';

export interface CliContext {
  apiUrl: string | undefined;
  getApiKey(): string | undefined;
  loadConfig(): { apiUrl?: string; outputFormat?: string; currentProject?: string };
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

async function loadSdk(ctx: CliContext) {
  if (!ctx.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
  const apiKey = ctx.getApiKey() ?? die('Not logged in');
  const { createFidscript } = await import('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}

async function printTable(rows: Record<string, unknown>[], fmt: string): Promise<void> {
  const { print } = await import('../utils/output');
  print(rows, fmt as 'table' | 'json' | 'raw');
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(prompt, resolve));
  rl.close();
  return answer.toLowerCase() === 'y';
}

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
        const jobs = await sdk.cron.list(projectId);
        const rows = (jobs as any[]).map((j) => ({
          id: j.id?.slice(0, 12),
          name: j.name,
          schedule: j.cronExpression,
          enabled: j.enabled ? '✓' : '✗',
          lastRun: j.lastRunAt ? new Date(j.lastRunAt).toLocaleString() : '—',
          nextRun: j.nextRunAt ? new Date(j.nextRunAt).toLocaleString() : '—',
        }));
        await printTable(rows, output);
      } catch (e) {
        die(`List failed: ${(e as Error).message}`);
      }
    });

  cronCmd
    .command('get <jobId>')
    .description('Get a cron job by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (jobId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const j = await sdk.cron.get(projectId, jobId) as any;
        console.log(`Name:        ${j.name}`);
        console.log(`ID:          ${j.id}`);
        console.log(`Schedule:    ${j.cronExpression}`);
        console.log(`Timezone:    ${j.timezone}`);
        console.log(`Enabled:     ${j.enabled ? '✓' : '✗'}`);
        console.log(`State:       ${j.state}`);
        console.log(`Endpoint:    ${j.endpoint ?? '—'}`);
        console.log(`Function ID: ${j.functionId ?? '—'}`);
        console.log(`Last run:    ${j.lastRunAt ?? '—'}`);
        console.log(`Next run:    ${j.nextRunAt ?? '—'}`);
      } catch (e) {
        die(`Get failed: ${(e as Error).message}`);
      }
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
      try {
        const j = await sdk.cron.create(projectId, {
          name,
          cronExpression: schedule,
          endpoint: opts.url,
          enabled: !!opts.enabled,
        }) as any;
        console.log(`✓ Created cron job ${j.id}: ${j.name} (${j.cronExpression})`);
      } catch (e) {
        die(`Create failed: ${(e as Error).message}`);
      }
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
      if (opts.name) data.name = opts.name;
      if (opts.schedule) data.cronExpression = opts.schedule;
      if (opts.enabled !== undefined) data.enabled = opts.enabled === 'true';
      try {
        await sdk.cron.update(projectId, jobId, data);
        console.log(`✓ Updated cron job ${jobId}`);
      } catch (e) {
        die(`Update failed: ${(e as Error).message}`);
      }
    });

  cronCmd
    .command('delete <jobId>')
    .description('Delete a cron job')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (jobId: string, opts: { project?: string; yes?: boolean }) => {
      const projectId = opts.project ?? die('No project ID (--project)');
      if (!opts.yes && !(await confirm(`Delete cron job ${jobId}? [y/N] `))) { console.log('Cancelled.'); return; }
      const sdk = await loadSdk(ctx);
      try {
        await sdk.cron.delete(projectId, jobId);
        console.log(`✓ Deleted cron job ${jobId}`);
      } catch (e) {
        die(`Delete failed: ${(e as Error).message}`);
      }
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
      } catch (e) {
        die(`Trigger failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(cronCmd);
}
