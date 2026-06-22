#!/usr/bin/env node
/**
 * Phase 18 — FIDScript CLI entry point.
 * Usage: fidscript <command> [options]
 *
 * The CLI delegates credential + config management to the shared config module
 * (../config/index.ts) so both the binary and library consumers get the same
 * behaviour.  No hardcoded default API URL — every open-source consumer picks
 * their own host via FIDScript_API_URL env var or ~/.fidscript/config.json.
 */
import { Command } from 'commander';
import { writeFileSync, chmodSync } from 'fs';
import {
  ensureDir,
  CREDENTIALS_FILE,
  loadConfig,
  loadCredentials,
} from '../config/index';

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
    const cfg = loadConfig();
    if (!cfg.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
    const apiKey = getApiKey() ?? die('Not logged in — run: fidscript login <key>');
    const { createFidscript } = await import('@fidscript/sdk');
    const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
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
      if (!cfg.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
      const apiKey = getApiKey() ?? die('Not logged in');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      const p = await sdk.projects.create({ name, type: opts.type ?? 'frontend' });
      console.log(`Created project ${p.id}: ${p.name}`);
    });
  projectsCmd
    .command('list')
    .description('List all projects')
    .action(async () => {
      if (!cfg.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
      const apiKey = getApiKey() ?? die('Not logged in');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
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
      if (!cfg.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project or set currentProject in config)');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      console.log(`Tailing logs for project ${projectId}...`);
      try {
        for await (const entry of sdk.logs.streamLogs(projectId, { stream: opts.stream, level: opts.level as 'debug' | 'info' | 'warn' | 'error' | 'fatal' })) {
          console.log(`[${entry.timestamp}] ${entry.level}: ${entry.message}`);
        }
      } catch (e) {
        die(`Log stream error: ${(e as Error).message}`);
      }
    });

  // init --template <id> <name> [--project <projectId>]
  program
    .command('init')
    .description('Scaffold a new project from a template')
    .argument('<template>', 'Template ID (e.g. static-site, node-api)')
    .argument('<name>', 'Name for the new project')
    .option('-p, --project <id>', 'Parent project ID for template sourcing', cfg.currentProject ?? '')
    .action(async (template: string, name: string, opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
      const apiKey = getApiKey() ?? die('Not logged in');
      const parentProjectId = opts.project ?? die('No project ID (--project or set currentProject in config)');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      console.log(`Scaffolding project "${name}" from template "${template}"...`);
      try {
        const result = await sdk.templates.generateAndDeploy(parentProjectId, template, name, {});
        console.log(`Project created: ${result.project.id}`);
        console.log(`Deployment: ${result.deployment.id} (${result.deployment.status})`);
      } catch (e) {
        die(`Failed to scaffold project: ${(e as Error).message}`);
      }
    });

  // deployments list [--project <id>]
  program
    .command('deployments list')
    .description('List deployments for a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project or set currentProject in config)');
      const { createFidscript } = await import('@fidscript/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      const items = await sdk.deployments.list(projectId);
      printTable(items as unknown as Record<string, unknown>[], program.opts().output ?? 'table');
    });

  await program.parseAsync(argv);
}

run(process.argv).catch(e => { console.error(e); process.exit(1); });
