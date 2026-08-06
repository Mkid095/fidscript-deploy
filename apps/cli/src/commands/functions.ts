/**
 * CLI commands — functions (edge runtime).
 * Mirrors sdk.functions.* methods; follows the patterns in fidscript.ts.
 * `functions logs` lives in functions-logs.ts to keep this orchestrator under
 * the ANPAS 150-line limit; shared helpers in functions-helpers.ts.
 */
import { Command } from 'commander';
import { die, loadSdk } from './functions-helpers';
import type { CliContext } from './functions-helpers';
import { addFunctionLogsCommand } from './functions-logs';

export { loadSdk };
export type { CliContext } from './functions-helpers';

export function registerFunctionsCommands(program: Command, ctx: CliContext): void {
  const fn = new Command('functions');
  const cfg = ctx.loadConfig();

  fn.command('list')
    .description('List functions in a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const items = await sdk.functions.list(projectId);
        const rows = items.map((f: any) => ({
          id: f.id?.slice(0, 12), name: f.name, runtime: f.runtime,
          status: f.status, created: new Date(f.createdAt).toLocaleDateString(),
        }));
        console.log(JSON.stringify(rows, null, 2));
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  fn.command('get <functionId>')
    .description('Get a single function by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (functionId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const f: any = await sdk.functions.get(projectId, functionId);
        console.log(`Name:     ${f.name}`);
        console.log(`ID:       ${f.id}`);
        console.log(`Runtime:  ${f.runtime}`);
        console.log(`Status:   ${f.status}`);
        console.log(`Created:  ${f.createdAt}`);
        if (f.currentVersion) console.log(`Version:  ${f.currentVersion}`);
        if (f.entryPoint) console.log(`Entry:    ${f.entryPoint}`);
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });

  fn.command('create <name>')
    .description('Create a new function')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .requiredOption('-r, --runtime <runtime>', 'Runtime (e.g. node, python, deno)')
    .option('--memory <mb>', 'Memory in MB', (v) => parseInt(v, 10))
    .option('--timeout <seconds>', 'Timeout in seconds', (v) => parseInt(v, 10))
    .action(async (name: string, opts: { project?: string; runtime: string; memory?: number; timeout?: number }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const f: any = await sdk.functions.create(projectId, {
          name, runtime: opts.runtime, memoryMb: opts.memory, timeoutSeconds: opts.timeout,
        });
        console.log(`Created function ${f.id}: ${f.name} (status: ${f.status})`);
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  fn.command('delete <functionId>')
    .description('Delete a function (prompts for confirmation)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (functionId: string, opts: { project?: string; yes?: boolean }) => {
      if (!opts.yes) {
        const answer = await new Promise<string>((resolve) => {
          process.stdout.write(`Delete function ${functionId}? [y/N] `);
          process.stdin.once('data', (d) => resolve(d.toString().trim().toLowerCase()));
        });
        if (answer !== 'y' && answer !== 'yes') { console.log('Cancelled.'); return; }
      }
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        await sdk.functions.delete(projectId, functionId);
        console.log(`Deleted function ${functionId}`);
      } catch (e) { die(`Delete failed: ${(e as Error).message}`); }
    });

  fn.command('invoke <functionId>')
    .description('Invoke a function with a JSON payload')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--payload <json>', 'Payload as JSON string', '{}')
    .action(async (functionId: string, opts: { project?: string; payload?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      let payload: unknown;
      try { payload = opts.payload ? JSON.parse(opts.payload) : {}; }
      catch { die('--payload must be valid JSON, e.g. \'{"name":"world"}\''); }
      try {
        const res: any = await sdk.functions.invoke(projectId, functionId, payload);
        console.log(JSON.stringify(res.result ?? res, null, 2));
      } catch (e) { die(`Invoke failed: ${(e as Error).message}`); }
    });

  addFunctionLogsCommand(fn, ctx);

  program.addCommand(fn);
}
