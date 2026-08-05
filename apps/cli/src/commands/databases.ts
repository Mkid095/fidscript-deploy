/**
 * CLI commands — databases (managed Postgres).
 * Mirrors sdk.databases.* methods; follows the patterns in fidscript.ts.
 */
import { Command } from 'commander';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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
  const { createFidscript } = require('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}

export function registerDatabasesCommands(program: Command, ctx: CliContext): void {
  const db = new Command('databases');
  const cfg = ctx.loadConfig();

  db.command('list')
    .description('List databases in a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const items = await sdk.databases.list(projectId);
        const rows = items.map((d: any) => ({
          id: d.id?.slice(0, 12), name: d.name, type: d.type,
          status: d.status, created: new Date(d.createdAt).toLocaleDateString(),
        }));
        console.log(JSON.stringify(rows, null, 2));
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  db.command('get <databaseId>')
    .description('Get a single database by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (databaseId: string, _opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      try {
        const d: any = await sdk.databases.get(databaseId);
        console.log(`Name:         ${d.name}`);
        console.log(`ID:           ${d.id}`);
        console.log(`Type:         ${d.type} ${d.version ?? ''}`);
        console.log(`Status:       ${d.status}`);
        console.log(`Environment:  ${d.environment}`);
        console.log(`Project:      ${d.projectId}`);
        console.log(`Created:      ${d.createdAt}`);
        console.log(`Updated:      ${d.updatedAt}`);
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });

  db.command('create <name>')
    .description('Create a new database')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-t, --type <type>', 'Database type (e.g. postgresql, mysql)', 'postgresql')
    .option('-e, --environment <env>', 'Environment (production, staging, development)', 'production')
    .action(async (name: string, opts: { project?: string; type?: string; environment?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const d: any = await sdk.databases.create(projectId, {
          name, type: opts.type, environment: opts.environment,
        });
        console.log(`Created database ${d.id}: ${d.name} (status: ${d.status})`);
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  db.command('delete <databaseId>')
    .description('Delete a database (prompts for confirmation)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (databaseId: string, opts: { project?: string; yes?: boolean }) => {
      if (!opts.yes) {
        const answer = await new Promise<string>((resolve) => {
          process.stdout.write(`Delete database ${databaseId}? This drops all data. [y/N] `);
          process.stdin.once('data', (d) => resolve(d.toString().trim().toLowerCase()));
        });
        if (answer !== 'y' && answer !== 'yes') { console.log('Cancelled.'); return; }
      }
      const sdk = await loadSdk(ctx);
      try {
        await sdk.databases.delete(databaseId);
        console.log(`Deleted database ${databaseId}`);
      } catch (e) { die(`Delete failed: ${(e as Error).message}`); }
    });

  program.addCommand(db);
}
