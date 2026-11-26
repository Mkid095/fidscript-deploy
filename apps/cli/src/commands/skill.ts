/**
 * CLI command — fidscript skill install / remove.
 *
 * A "skill" teaches an AI agent *how and when* to operate the platform: the
 * commands to call, the credential to use, and the safety rules. It is a
 * real instruction artifact (a SKILL.md), not an MCP config dressed up as
 * one. When the account's token is MCP-enabled, a companion mcp.json is
 * written beside it so the agent can also reach the platform's MCP tools.
 *
 * MCP, skill, CLI stay separate concerns:
 *   - MCP     hands a compatible client the tools.
 *   - skill   tells the agent when and how to use them.
 *   - CLI     is the person's own terminal access.
 */
import { Command } from 'commander';
import { homedir } from 'node:os';
import {
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { FidscriptClient } from '@fidscript-deploy/sdk';
import { getApiKey, loadConfig } from '../config/index';

const SKILL_NAME = 'fidscript';

interface InstallOpts {
  agent?: 'claude' | 'cursor';
}

const SKILLS_DIR = join(homedir(), '.fidscript', 'skills', SKILL_NAME);

/** The tool domains, from the platform's own MCP surface when reachable. */
async function toolMap(): Promise<Record<string, string[]>> {
  const key = getApiKey();
  const cfg = loadConfig();
  if (key && cfg.apiUrl) {
    try {
      const client = new FidscriptClient({ apiKey: key, baseURL: cfg.apiUrl });
      const tools = await client.get<Array<{ tool: string; permissions: string[] }>>('/api/v1/mcp/tools');
      const grouped: Record<string, string[]> = {};
      for (const t of tools) {
        const domain = t.tool.split('_')[0] ?? t.tool;
        (grouped[domain] ??= []).push(t.tool);
      }
      if (Object.keys(grouped).length > 0) return grouped;
    } catch {
      // Fall through to the static map — the skill must be installable offline.
    }
  }
  return staticToolMap();
}

/** The CLI's own command map, used when the platform can't be reached. */
function staticToolMap(): Record<string, string[]> {
  return {
    projects: ['projects list', 'projects create', 'projects get'],
    deployments: ['deployments list', 'deployments get', 'deployments logs'],
    functions: ['functions list', 'functions create', 'functions invoke', 'functions logs'],
    databases: ['databases list', 'databases create', 'databases get', 'databases delete'],
    storage: ['storage list-buckets', 'storage upload', 'storage list-files', 'storage delete-bucket'],
    queues: ['queues list', 'queues create', 'queues publish', 'queues purge'],
    cron: ['cron list', 'cron create', 'cron trigger', 'cron delete'],
    email: ['email send', 'email inbox', 'email status', 'email templates'],
    domains: ['domains list', 'domains create', 'domains get-dns-records', 'domains check-health'],
    env: ['env list', 'env pull', 'env push'],
    whatsapp: ['whatsapp state', 'whatsapp connect', 'whatsapp identity', 'whatsapp disconnect'],
    instant: ['instant status', 'instant provision', 'instant config', 'instant delete'],
    registry: ['registry whoami', 'registry list', 'registry publish', 'registry link'],
  };
}

function skillMarkdown(tools: Record<string, string[]>): string {
  const domains = Object.entries(tools)
    .map(([domain, items]) => `### ${domain}\n${items.map((i) => `- \`${i}\``).join('\n')}`)
    .join('\n\n');
  return `---
name: fidscript
description: Operate the FIDScript platform — projects, deployments, databases, functions, storage, queues, email, domains, cron, WhatsApp, and the npm registry — from an agent.
---

# FIDScript operator skill

## When to use
When a task involves running or managing a FIDScript platform: deploying an app,
creating a project, wiring a database, publishing a package, or talking to the
platform's services. Check \`fidscript whoami\` first to confirm a token is stored.

## Authentication
- Log in once: \`fidscript login\` (email + password). It stores a revocable
  account token and links the registry — one credential, not two.
- The token lives in \`~/.fidscript/credentials.json\` (0600). Never print, commit,
  or copy it into a repo. If it is missing or revoked, run \`fidscript login\` again.
- Prefer the token over raw passwords; the platform revokes it from the dashboard.

## Commands
${domains}

Every command accepts \`-o json\` for machine-readable output and \`-p <project>\`
to target a project (default: the current one).

## The MCP tools (optional)
The platform also exposes these tools over MCP for a compatible client. A
companion \`mcp.json\` is written next to this skill when the account's token is
MCP-enabled; the skill's commands and the MCP tools are the same operations.

## Safety
- Read before you write: list/get before create/delete.
- Destructive operations (\`delete\`, \`purge\`, \`disconnect\`, \`unlink\`,
  \`databases delete\`, \`deployments\` stop/rollback) need explicit confirmation.
- Never store a credential in a project file or commit it.
`;
}

function mcpJson(apiUrl: string, key: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        fidscript: {
          command: 'fidscript-mcp',
          env: { FIDSCRIPT_API_URL: apiUrl, FIDSCRIPT_API_KEY: key },
        },
      },
    },
    null,
    2,
  );
}

async function install(opts: InstallOpts): Promise<void> {
  const tools = await toolMap();
  const key = getApiKey();
  const cfg = loadConfig();

  mkdirSync(SKILLS_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(join(SKILLS_DIR, 'SKILL.md'), skillMarkdown(tools), 'utf8');
  let wroteMcp = false;
  if (key && cfg.apiUrl) {
    writeFileSync(join(SKILLS_DIR, 'mcp.json'), mcpJson(cfg.apiUrl, key), 'utf8');
    wroteMcp = true;
  }

  const targets: string[] = [SKILLS_DIR];
  if (opts.agent === 'claude') {
    const dest = join(homedir(), '.claude', 'skills', SKILL_NAME);
    copyDir(SKILLS_DIR, dest);
    targets.push(dest);
  } else if (opts.agent === 'cursor') {
    const dest = join(homedir(), '.cursor', 'skills', SKILL_NAME);
    copyDir(SKILLS_DIR, dest);
    targets.push(dest);
    mergeCursorMcp(cfg.apiUrl ?? '', key);
  }

  console.log(`Installed the FIDScript skill to: ${targets.join(', ')}`);
  console.log(wroteMcp ? 'Wrote SKILL.md + mcp.json (MCP companion).' : 'Wrote SKILL.md. Run `fidscript login` to also write the MCP companion.');
}

function remove(opts: InstallOpts): void {
  const targets: string[] = [SKILLS_DIR];
  if (opts.agent === 'claude') targets.push(join(homedir(), '.claude', 'skills', SKILL_NAME));
  else if (opts.agent === 'cursor') targets.push(join(homedir(), '.cursor', 'skills', SKILL_NAME));
  for (const t of targets) {
    if (existsSync(t)) rmSync(t, { recursive: true, force: true });
  }
  console.log(`Removed the FIDScript skill from: ${targets.join(', ')}`);
}

function copyDir(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const f of ['SKILL.md', 'mcp.json']) {
    const src = join(from, f);
    if (existsSync(src)) writeFileSync(join(to, f), readFileSync(src, 'utf8'), 'utf8');
  }
}

/** Merge the fidserver MCP block into ~/.cursor/mcp.json when it exists. */
function mergeCursorMcp(apiUrl: string, key?: string): void {
  if (!key) return;
  const p = join(homedir(), '.cursor', 'mcp.json');
  let existing: Record<string, unknown> = {};
  if (existsSync(p)) {
    try {
      existing = JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      existing = {};
    }
  }
  existing.mcpServers = {
    ...((existing.mcpServers as Record<string, unknown>) ?? {}),
    fidscript: { command: 'fidscript-mcp', env: { FIDSCRIPT_API_URL: apiUrl, FIDSCRIPT_API_KEY: key } },
  };
  mkdirSync(join(homedir(), '.cursor'), { recursive: true });
  writeFileSync(p, JSON.stringify(existing, null, 2), 'utf8');
}

export function registerSkillCommands(program: Command): void {
  const skill = new Command('skill');
  skill.description('Install or remove the FIDScript operator skill for an AI agent');
  skill
    .command('install')
    .description('Write the skill (and the MCP companion, when a token is stored)')
    .option('--agent <name>', 'Also install into an agent’s skills dir: claude | cursor', undefined)
    .action(async (opts: InstallOpts) => {
      await install(opts);
    });
  skill
    .command('remove')
    .description('Remove the installed skill')
    .option('--agent <name>', 'Also remove from an agent’s skills dir: claude | cursor', undefined)
    .action((opts: InstallOpts) => {
      remove(opts);
    });
  program.addCommand(skill);
}
