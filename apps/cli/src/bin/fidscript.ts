#!/usr/bin/env node
/**
 * Phase 18 — FIDScript CLI entry point.
 * Usage: fidscript <command> [options]
 */
import { Command } from 'commander';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.fidscript');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

interface CliConfig {
  apiUrl: string;
  currentProject?: string;
  outputFormat: 'table' | 'json' | 'raw';
}

interface CliCredentials {
  apiKey?: string;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { mode: 0o700 });
  }
}

function loadConfig(): CliConfig {
  ensureDir();
  if (!existsSync(CONFIG_FILE)) {
    return { apiUrl: 'https://api.fidscript.com', outputFormat: 'table' };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as CliConfig;
  } catch {
    return { apiUrl: 'https://api.fidscript.com', outputFormat: 'table' };
  }
}

function loadCredentials(): CliCredentials {
  ensureDir();
  if (!existsSync(CREDENTIALS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8')) as CliCredentials;
  } catch {
    return {};
  }
}

function getApiKey(): string | undefined {
  return loadCredentials().apiKey;
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function printTable(rows: Record<string, unknown>[], fmt: string): void {
  if (fmt === 'json') {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (fmt === 'raw') {
    rows.forEach(r => console.log(typeof r === 'object' ? JSON.stringify(r) : r));
    return;
  }
  if (rows.length === 0) {
    console.log('(no data)');
    return;
  }
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k =>
    Math.max(k.length, ...rows.map(r => String((r as Record<string, unknown>)[k] ?? '').length)),
  );
  console.log(keys.map((k, i) => k.padEnd(widths[i])).join('  '));
  console.log(widths.map(w => '-'.repeat(w)).join('  '));
  for (const row of rows) {
    const obj = row as Record<string, unknown>;
    console.log(keys.map((k, i) => String(obj[k] ?? '').slice(0, widths[i]).padEnd(widths[i])).join('  '));
  }
}

async function run(argv: string[]): Promise<void> {
  const cfg = loadConfig();
  const program = new Command();
  program
    .name('fidscript')
    .version('1.0.0')
    .option('-o, --output <fmt>', 'Output format: table|json|raw', cfg.outputFormat ?? 'table');

  // login <key>
  program
    .command('login <key>')
    .description('Store your API key in ~/.fidscript/')
    .action((_key: string) => {
      const creds = { apiKey: _key };
      ensureDir();
      writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds), 'utf8');
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
  program.command('whoami').description('Show current user').action(async () => {
    const apiKey = getApiKey() ?? die('Not logged in — run: fidscript login <key>');
    const { createFidscript } = await import('@fidscript/sdk');
    const sdk = createFidscript({ apiKey });
    try {
      const { user } = await sdk.auth.getSession();
      console.log(`Logged in as ${user.email} (role: ${user.role})`);
    } catch (e) {
      die(`Authentication failed: ${(e as Error).message}`);
    }
  });

  // projects — parent command with subcommands
  const projectsCmd = new Command('projects');
  projectsCmd
    .command('create <name>')
    .description('Create a new project')
    .option('--type <type>', 'Project type', 'frontend')
    .action(async (name: string, opts: { type?: string }) => {
      const apiKey = getApiKey() ?? die('Not logged in');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey });
      const p = await sdk.projects.create({ name, type: opts.type ?? 'frontend' });
      console.log(`Created project ${p.id}: ${p.name}`);
    });
  projectsCmd
    .command('list')
    .description('List all projects')
    .action(async () => {
      const apiKey = getApiKey() ?? die('Not logged in');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey });
      const items = await sdk.projects.list();
      printTable(items as unknown as Record<string, unknown>[], program.opts().output ?? 'table');
    });
  program.addCommand(projectsCmd);

  // logs tail [--project <id>]
  program
    .command('logs tail')
    .description('Tail live logs (Ctrl+C to stop)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-s, --stream <name>', 'Stream name', 'default')
    .option('-l, --level <level>', 'Min level', 'info')
    .action(async (opts: { project?: string; stream?: string; level?: string }) => {
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project or set currentProject in config)');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey });
      console.log(`Tailing logs for project ${projectId}...`);
      try {
        for await (const entry of sdk.logs.streamLogs(projectId, { stream: opts.stream, level: opts.level as 'debug' | 'info' | 'warn' | 'error' | 'fatal' })) {
          console.log(`[${entry.timestamp}] ${entry.level}: ${entry.message}`);
        }
      } catch (e) {
        die(`Log stream error: ${(e as Error).message}`);
      }
    });

  // deployments list [--project <id>]
  program
    .command('deployments list')
    .description('List deployments for a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project or set currentProject in config)');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey });
      const items = await sdk.deployments.list(projectId);
      printTable(items as unknown as Record<string, unknown>[], program.opts().output ?? 'table');
    });

  await program.parseAsync(argv);
}

run(process.argv).catch(e => { console.error(e); process.exit(1); });
