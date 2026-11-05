/**
 * CLI commands — Instant (the project's data plane).
 *
 * Mirrors sdk.instant.* methods. An application's tables, users and
 * permissions live in its Instant app; this is how an operator provisions
 * one and reads its address.
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

export function registerInstantCommands(program: Command, ctx: CliContext): void {
  const instant = new Command('instant');
  const cfg = ctx.loadConfig();

  instant
    .command('status')
    .description("Show the project's Instant app, and whether Instant is available")
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const res = await sdk.instant.get(projectId);
        if (!res.available) {
          console.log('Instant is not connected — the platform holds no superuser token.');
          return;
        }
        if (!res.app) {
          console.log('This project has no Instant app yet.');
          console.log(`Provision one with: fidscript instant provision -p ${projectId}`);
          return;
        }
        console.log(`App ID:   ${res.app.appId}`);
        console.log(`Title:   ${res.app.title}`);
        console.log(`Status:  ${res.app.status}`);
        console.log(`Created: ${res.app.createdAt}`);
        console.log(`Console: ${res.dashboardUrl}`);
      } catch (e) {
        die(`Status failed: ${(e as Error).message}`);
      }
    });

  instant
    .command('provision')
    .description("Provision the project's Instant app")
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-t, --title <title>', "The app's title (the project's name by default)")
    .action(async (opts: { project?: string; title?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const app = await sdk.instant.provision(projectId, opts.title);
        console.log(`Provisioned Instant app ${app.appId}`);
        console.log(`Title: ${app.title}`);
      } catch (e) {
        die(`Provision failed: ${(e as Error).message}`);
      }
    });

  instant
    .command('config')
    .description('Show what a deployed application needs to reach its data plane')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const config = await sdk.instant.clientConfig(projectId);
        console.log('The deployment carries these already — this is what they are:');
        console.log(`  INSTANT_APP_ID       = ${config.appId}`);
        console.log(`  INSTANT_API_URI      = ${config.apiHost}`);
        console.log(`  INSTANT_WS_URI       = ${config.apiHost.replace(/^http/, 'ws')}/runtime/session`);
        console.log(`  INSTANT_STORAGE_URI  = ${config.apiHost}`);
        console.log(`  INSTANT_DASH_URI     = ${config.dashboardUrl}`);
      } catch (e) {
        die(`Config failed: ${(e as Error).message}`);
      }
    });

  instant
    .command('delete')
    .description("Delete the project's Instant app and everything in it")
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--yes', 'Do not ask for confirmation')
    .action(async (opts: { project?: string; yes?: boolean }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      if (!opts.yes) {
        console.log(
          'This deletes the Instant app and everything in it — its tables, its users and\n' +
            'its permission rules. It cannot be undone.',
        );
        const answer = await new Promise<string>((resolve) => {
          const rl = require('readline').createInterface({
            input: process.stdin, output: process.stdout,
          });
          rl.question('Delete it? [y/N]: ', resolve);
        });
        if (answer.trim().toLowerCase() !== 'y') {
          console.log('Left alone.');
          return;
        }
      }
      try {
        await sdk.instant.unlink(projectId);
        console.log('Deleted.');
      } catch (e) {
        die(`Delete failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(instant);
}
