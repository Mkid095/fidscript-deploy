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
  resolveApiKey,
} from '../config/index';
import { die, loadSdk } from '../commands/cli-runtime-helpers';
import { addLoginCommand } from '../commands/login';
import { addConfigureCommand } from '../commands/configure';
import { addGuideCommand } from '../commands/guide';
import { registerWhatsappCommands } from '../commands/whatsapp';
import { registerSkillCommands } from '../commands/skill';
import { registerRegistryAccountCommands } from '../commands/registry-account';
import { registerFunctionsCommands } from '../commands/functions';
import { registerDatabasesCommands } from '../commands/databases';
import { registerInstantCommands } from '../commands/instant';
import { registerRegistryCommands } from '../commands/registry';
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
  return resolveApiKey(loadCredentials());
}

async function run(argv: string[]): Promise<void> {
  const cfg = loadConfig();
  const program = new Command();
  program
    .name('fidscript')
    .version(CLI_VERSION)
    .option('-o, --output <fmt>', 'Output format: table|json|raw', cfg.outputFormat ?? 'table')
    .addHelpText(
      'after',
      '\nQuick start: fidscript configure → fidscript login → fidscript projects list\n' +
        'Full guide: fidscript guide\n',
    );

  // login: `fidscript login` signs in with email + password;
  // `fidscript login <key>` stores a token the dashboard made.
  addLoginCommand(program, { apiUrl: cfg.apiUrl });

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

  // The operator story: configure where, log in once, and read the guide.
  addConfigureCommand(program, { apiUrl: cfg.apiUrl });
  addGuideCommand(program);
  registerSkillCommands(program);

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
  registerInstantCommands(program, ctx);
  registerWhatsappCommands(program, ctx);
  registerRegistryCommands(program, ctx);

  // The registry's own account, tied to the platform user: link / unlink / status.
  const registryCmd = program.commands.find((c) => c.name() === 'registry');
  if (registryCmd) registerRegistryAccountCommands(registryCmd, ctx);

  await program.parseAsync(argv);
}

run(process.argv).catch(e => { console.error(e); process.exit(1); });