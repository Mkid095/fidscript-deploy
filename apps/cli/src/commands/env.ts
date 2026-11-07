/**
 * CLI commands — env vars per project.
 * `env list` — list keys only (no values)
 * `env pull` — fetch + decrypt env vars, print as .env
 * `env push` — read .env from stdin, upsert
 *
 * The CLI never logs env values in `list` mode.  In `pull` mode, values are
 * decrypted server-side (only the owner/admin can see them — see
 * ProjectEnvService) and the user has explicitly asked for them, so we print.
 * Push mode accepts .env from stdin only (never logged).
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

async function printTable(rows: Record<string, unknown>[], fmt: string): Promise<void> {
  const { print } = await import('../utils/output');
  print(rows, fmt as 'table' | 'json' | 'raw');
}

async function readStdin(): Promise<string> {
  // Read everything from stdin until EOF.  Caller pipes in the .env file.
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function parseDotEnv(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes (single or double) if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function registerEnvCommands(program: Command, ctx: CliContext): void {
  const env = new Command('env');
  const cfg = ctx.loadConfig();
  const output = (program.opts().output as string) ?? cfg.outputFormat ?? 'table';

  // env list — names + key only, NEVER values
  env
    .command('list')
    .description('List env var keys for a project (values are never displayed)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const vars = await sdk.projects.getEnvVars(projectId);
        const rows = (vars as Array<{ key: string }>).map((v) => ({ key: v.key }));
        await printTable(rows, output);
      } catch (e) {
        die(`List failed: ${(e as Error).message}`);
      }
    });

  // env pull — fetch + decrypt, output as .env
  env
    .command('pull [projectId]')
    .description('Fetch and decrypt env vars, print as .env format')
    .option('-p, --project <id>', 'Project ID (overrides positional arg)')
    .action(async (positional: string | undefined, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? positional ?? cfg.currentProject ?? die('No project ID (--project, positional, or currentProject)');
      try {
        const vars = (await sdk.projects.getEnvVars(projectId)) as Array<{ key: string; value: string }>;
        for (const v of vars) {
          // Quote values that contain whitespace or # to keep them parseable.
          const needsQuotes = /[\s#]/.test(v.value);
          if (needsQuotes) console.log(`${v.key}="${v.value.replace(/"/g, '\\"')}"`);
          else console.log(`${v.key}=${v.value}`);
        }
      } catch (e) {
        die(`Pull failed: ${(e as Error).message}`);
      }
    });

  // env push — read .env from stdin, upsert
  env
    .command('push [projectId]')
    .description('Read .env from stdin and upsert env vars for a project')
    .option('-p, --project <id>', 'Project ID (overrides positional arg)')
    .action(async (positional: string | undefined, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? positional ?? cfg.currentProject ?? die('No project ID (--project, positional, or currentProject)');
      let input: string;
      try {
        input = await readStdin();
      } catch (e) {
        die(`Failed to read stdin: ${(e as Error).message}`);
      }
      const parsed = parseDotEnv(input);
      const keys = Object.keys(parsed);
      if (keys.length === 0) {
        console.log('(no env vars found in input)');
        return;
      }
      try {
        await sdk.projects.setEnvVars(projectId, parsed);
        // Print only the KEYS that were updated — never echo values.
        console.log(`✓ Pushed ${keys.length} env var(s): ${keys.join(', ')}`);
      } catch (e) {
        die(`Push failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(env);
}
