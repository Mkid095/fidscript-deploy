#!/usr/bin/env node
/**
 * Phase 18 — FIDScript CLI entry point.
 * Usage: fidscript <command> [options]
 *
 * This is the thin entry point. It:
 *   1. Parses argv and prints help/version.
 *   2. Stores API key on `login` / clears on `logout`.
 *   3. Prints the current user on `whoami`.
 *   4. Dispatches every other command to its register*Commands() module
 *      under ../commands. See each module's file header for the SDK method
 *      it wraps. No hardcoded default API URL — every open-source consumer
 *      picks their own host via FIDScript_API_URL or ~/.fidscript/config.json.
 */
import { Command } from 'commander';
import { writeFileSync, chmodSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_VERSION = (() => {
  // Try to read version from package.json adjacent to this file
  // (works in both dev via ts-node and after pnpm build)
  try {
    const pkgPath = resolve(__dirname, '../../package.json');
    const content = existsSync(pkgPath)
      ? JSON.parse(readFileSync(pkgPath, 'utf8'))
      : { version: '1.1.1' };
    return content.version ?? '1.1.1';
  } catch {
    return '1.1.1';
  }
})();
import {
  ensureDir,
  CREDENTIALS_FILE,
  loadConfig,
  loadCredentials,
} from '../config/index';
import { die, loadSdk } from '../commands/cli-runtime-helpers';
import { registerFunctionsCommands } from '../commands/functions';
import { registerDatabasesCommands } from '../commands/databases';
import { registerCronCommands } from '../commands/cron';
import { registerDomainsCommands } from '../commands/domains';
import { registerStorageCommands } from '../commands/storage';
import { registerQueuesCommands } from '../commands/queues';
import { registerEnvCommands } from '../commands/env';
import { registerProjectsCommands } from '../commands/projects';
import { registerDeploymentsCommands } from '../commands/deployments';
import { registerEmailCommands } from '../commands/email';
import { addInitCommand } from '../commands/init';
import { addLogsCommand } from '../commands/logs';

function getApiKey(): string | undefined {
  return loadCredentials().apiKey;
}

async function run(argv: string[]): Promise<void> {
  const cfg = loadConfig();
  const program = new Command();
  program
    .name('fidscript')
    .version(CLI_VERSION)
    .option('-o, --output <fmt>', 'Output format: table|json|raw', cfg.outputFormat ?? 'table');

  // login <key>
  program
    .command('login <key>')
    .description('Store your API key in ~/.fidscript/')
    .action((key: string) => {
      ensureDir();
      writeFileSync(CREDENTIALS_FILE, JSON.stringify({ apiKey: key }), 'utf8');
      chmodSync(CREDENTIALS_FILE, 0o600);
      console.log('Credentials stored in ~/.fidscript/');
    });

  // logout
  program.command('logout').description('Remove stored credentials').action(() => {
    ensureDir();
    writeFileSync(CREDENTIALS_FILE, JSON.stringify({}), 'utf8');
    chmodSync(CREDENTIALS_FILE, 0o600);
    console.log('Logged out.');
  });

  // whoami
  program.command('whoami').description('Show current identity and project memberships').action(async () => {
    const cfgInner = loadConfig();
    const ctx = { apiUrl: cfgInner.apiUrl, getApiKey, loadConfig };
    const apiKey = ctx.getApiKey();
    if (apiKey) {
      console.log(`Authenticated via API key`);
      const sdk = await loadSdk(ctx);
      try {
        const res = await sdk.projects.list() as any;
        const projects: any[] = res?.projects ?? [];
        if (projects.length > 0) {
          console.log(`Projects (${projects.length}):`);
          for (const p of projects) {
            console.log(`  - ${p.name} (${p.role ?? 'member'}) [${p.id}]`);
          }
        } else {
          console.log(`No project memberships found.`);
        }
      } catch (e) {
        die(`Authentication failed: ${(e as Error).message}`);
      }
    } else {
      const sdk = await loadSdk(ctx);
      try {
        const user = await sdk.auth.me();
        console.log(`Logged in as ${user.email} (role: ${user.role})`);
      } catch (e) {
        die(`Authentication failed: ${(e as Error).message}`);
      }
    }
  });

  const ctx = { apiUrl: cfg.apiUrl, getApiKey, loadConfig };

  // Top-level single commands (extracted to keep entry under 150L)
  addInitCommand(program, ctx);
  addLogsCommand(program, ctx);

  // ── COMMAND MODULES (register their own subcommands) ───────────────────
  registerFunctionsCommands(program, ctx);
  registerDatabasesCommands(program, ctx);
  registerCronCommands(program, ctx);
  registerDomainsCommands(program, ctx);
  registerStorageCommands(program, ctx);
  registerQueuesCommands(program, ctx);
  registerEnvCommands(program, ctx);
  registerProjectsCommands(program, ctx);
  registerDeploymentsCommands(program, ctx);
  registerEmailCommands(program, ctx);

  await program.parseAsync(argv);
}

run(process.argv).catch(e => { console.error(e); process.exit(1); });