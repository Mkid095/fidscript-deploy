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
import { registerFunctionsCommands } from '../commands/functions';
import { registerDatabasesCommands } from '../commands/databases';

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
    const { createFidscript } = await import('@fidscript-deploy/sdk');
    const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const user = await sdk.auth.me();
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
      const { createFidscript } = await import('@fidscript-deploy/sdk');
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
      const { createFidscript } = await import('@fidscript-deploy/sdk');
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
      const { createFidscript } = await import('@fidscript-deploy/sdk');
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
      const { createFidscript } = await import('@fidscript-deploy/sdk');
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
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      const items = await sdk.deployments.list(projectId);
      printTable(items as unknown as Record<string, unknown>[], program.opts().output ?? 'table');
    });

  // ── FUNCTIONS + DATABASES COMMANDS (extracted to keep bin under 150L) ───
  registerFunctionsCommands(program, { apiUrl: cfg.apiUrl, getApiKey, loadConfig });
  registerDatabasesCommands(program, { apiUrl: cfg.apiUrl, getApiKey, loadConfig });

  // ── EMAIL COMMANDS ──────────────────────────────────────────────────
  const emailCmd = new Command('email');

  // email send
  emailCmd
    .command('send')
    .description('Send a transactional email')
    .requiredOption('-t, --to <email>', 'Recipient address')
    .requiredOption('-s, --subject <subject>', 'Subject line')
    .option('--from <email>', 'Sender address')
    .option('--text <body>', 'Plain text body')
    .option('--html <body>', 'HTML body')
    .option('--reply-to <email>', 'Reply-To address')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const result = await sdk.email.send(projectId, {
          to: opts.to,
          from: opts.from,
          subject: opts.subject,
          text: opts.text,
          html: opts.html,
          replyTo: opts.replyTo,
        });
        console.log(`✓ Email queued: ${result.messageId} → ${opts.to} (status: ${result.status})`);
      } catch (e) {
        die(`Send failed: ${(e as Error).message}`);
      }
    });

  // email send-template
  emailCmd
    .command('send-template <templateId>')
    .description('Send a templated email')
    .requiredOption('-t, --to <email>', 'Recipient address')
    .option('-v, --vars <json>', 'Template variables as JSON', '{}')
    .option('--from <email>', 'Override sender address')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (templateId: string, opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      let variables: Record<string, string>;
      try {
        variables = JSON.parse(opts.vars);
      } catch {
        die('--vars must be valid JSON, e.g. \'{"name":"John"}\'');
      }
      try {
        const result = await sdk.email.sendTemplated(projectId, templateId, {
          to: opts.to,
          from: opts.from,
          variables,
        });
        console.log(`✓ Templated email sent: ${result.messageId} → ${opts.to}`);
      } catch (e) {
        die(`Send failed: ${(e as Error).message}`);
      }
    });

  // email inbox
  emailCmd
    .command('inbox')
    .description('List recent messages')
    .option('-l, --limit <n>', 'Number of messages', '20')
    .option('--unread', 'Show only unread')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const messages = await sdk.email.listMessages(projectId, {
          limit: parseInt(opts.limit, 10),
          unread: opts.unread,
        });
        const rows = messages.map(m => ({
          id: (m as any).id?.slice(0, 12),
          from: (m as any).from,
          subject: (m as any).subject?.slice(0, 40),
          status: (m as any).status,
          date: new Date((m as any).createdAt).toLocaleDateString(),
        }));
        printTable(rows, program.opts().output ?? 'table');
      } catch (e) {
        die(`Failed: ${(e as Error).message}`);
      }
    });

  // email status <messageId>
  emailCmd
    .command('status <messageId>')
    .description('Get delivery status for a message')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (messageId: string, opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const status = await sdk.email.getMessageStatus(projectId, messageId);
        console.log(`Status: ${status.status}`);
        if (status.failureType) console.log(`Failure: ${status.failureType}`);
        console.log(`Attempts: ${status.retryCount}`);
        if (status.attempts?.length) {
          console.log('\nDelivery attempts:');
          for (const a of status.attempts) {
            console.log(`  #${a.attempt}: ${a.status} (${a.durationMs}ms)${a.failureType !== 'NONE' && a.failureType ? ` [${a.failureType}]` : ''}`);
          }
        }
      } catch (e) {
        die(`Failed: ${(e as Error).message}`);
      }
    });

  // email templates list
  emailCmd
    .command('templates')
    .description('List email templates')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const templates = await sdk.email.listTemplates(projectId);
        const rows = templates.map((t: any) => ({
          name: t.name,
          subject: t.subject?.slice(0, 40),
          from: t.fromAddress ?? '—',
          vars: t.variables?.length ?? 0,
          active: t.isActive ? '✓' : '✗',
        }));
        printTable(rows, program.opts().output ?? 'table');
      } catch (e) {
        die(`Failed: ${(e as Error).message}`);
      }
    });

  // email domains list
  emailCmd
    .command('domains')
    .description('List email domains')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const domains = await sdk.email.listDomains(projectId);
        const rows = domains.map((d: any) => ({
          domain: d.domain,
          status: d.status,
          dkim: d.dkimVerified ? '✓' : '✗',
          spf: d.spfVerified ? '✓' : '✗',
          dmarc: d.dmarcVerified ? '✓' : '✗',
          mx: d.mxVerified ? '✓' : '✗',
        }));
        printTable(rows, program.opts().output ?? 'table');
      } catch (e) {
        die(`Failed: ${(e as Error).message}`);
      }
    });

  // email analytics
  emailCmd
    .command('analytics')
    .description('Show email delivery analytics')
    .option('-d, --days <n>', 'Number of days', '30')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: any) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const overview = await sdk.email.getDeliveryOverview(projectId, parseInt(opts.days, 10));
        console.log(`\n📊 Email Analytics (last ${overview.rangeDays} days)\n`);
        console.log(`Total messages: ${overview.total}`);
        console.log(`Delivery rate:  ${(overview.deliveryRate * 100).toFixed(1)}%`);
        console.log(`Bounce rate:    ${(overview.bounceRate * 100).toFixed(1)}%`);
        console.log(`Open rate:      ${(overview.openRate * 100).toFixed(1)}%`);
        console.log(`Click rate:     ${(overview.clickRate * 100).toFixed(1)}%`);
        console.log(`\nStatus breakdown:`);
        for (const [status, count] of Object.entries(overview.byStatus)) {
          if (count as number > 0) console.log(`  ${status}: ${count}`);
        }
      } catch (e) {
        die(`Failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(emailCmd);

  // ── CRON COMMANDS ──────────────────────────────────────────────────
  const cronCmd = new Command('cron');

  cronCmd
    .command('list')
    .description('List cron jobs in a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
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
        printTable(rows, program.opts().output ?? 'table');
      } catch (e) {
        die(`List failed: ${(e as Error).message}`);
      }
    });

  cronCmd
    .command('get <jobId>')
    .description('Get a cron job by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (jobId: string, opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const j = await sdk.cron.get(projectId, jobId) as any;
        console.log(`Name:         ${j.name}`);
        console.log(`ID:           ${j.id}`);
        console.log(`Schedule:     ${j.cronExpression}`);
        console.log(`Timezone:     ${j.timezone}`);
        console.log(`Enabled:      ${j.enabled ? '✓' : '✗'}`);
        console.log(`State:        ${j.state}`);
        console.log(`Endpoint:     ${j.endpoint ?? '—'}`);
        console.log(`Function ID:  ${j.functionId ?? '—'}`);
        console.log(`Last run:     ${j.lastRunAt ?? '—'}`);
        console.log(`Next run:     ${j.nextRunAt ?? '—'}`);
      } catch (e) {
        die(`Get failed: ${(e as Error).message}`);
      }
    });

  cronCmd
    .command('create <name> <schedule>')
    .description('Create a cron job')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--url <url>', 'HTTP endpoint to invoke')
    .option('--method <method>', 'HTTP method (GET, POST, ...)', 'POST')
    .option('--enabled', 'Enable the job immediately')
    .action(async (name: string, schedule: string, opts: { project?: string; url?: string; method?: string; enabled?: boolean }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
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
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
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
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      if (!opts.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => rl.question(`Delete cron job ${jobId}? [y/N] `, resolve));
        rl.close();
        if (answer.toLowerCase() !== 'y') { console.log('Cancelled.'); return; }
      }
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
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
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        await sdk.cron.trigger(projectId, jobId);
        console.log(`✓ Job triggered`);
      } catch (e) {
        die(`Trigger failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(cronCmd);

  // ── DOMAINS COMMANDS ───────────────────────────────────────────────
  const domainsCmd = new Command('domains');

  domainsCmd
    .command('list')
    .description('List domains in a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const list = await sdk.domains.list(projectId);
        const rows = list.map((d: any) => ({
          domain: d.domain,
          type: Array.isArray(d.type) ? d.type.join(',') : (d.type ?? '—'),
          status: d.sslStatus ?? '—',
          registered: d.dnsStatus ?? '—',
          expires: d.sslExpiresAt ? new Date(d.sslExpiresAt).toLocaleDateString() : '—',
        }));
        printTable(rows, program.opts().output ?? 'table');
      } catch (e) {
        die(`List failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('get <domainId>')
    .description('Get a domain by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const d = await sdk.domains.get(domainId) as any;
        console.log(`Domain:         ${d.domain}`);
        console.log(`ID:             ${d.id}`);
        console.log(`Type:           ${Array.isArray(d.type) ? d.type.join(',') : d.type}`);
        console.log(`DNS status:     ${d.dnsStatus}`);
        console.log(`SSL status:     ${d.sslStatus}`);
        console.log(`SSL enabled:    ${d.sslEnabled ? '✓' : '✗'}`);
        console.log(`SSL expires:    ${d.sslExpiresAt ?? '—'}`);
        console.log(`DNS mode:       ${d.dnsMode}`);
        console.log(`Custom:         ${d.isCustom ? '✓' : '✗'}`);
        console.log(`Primary:        ${d.isPrimary ? '✓' : '✗'}`);
        console.log(`Apex:           ${d.apexDomain ? '✓' : '✗'}`);
      } catch (e) {
        die(`Get failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('create <domain>')
    .description('Add a domain to a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--type <type>', 'Domain type (DEPLOYMENT, EMAIL, ...)')
    .action(async (domain: string, opts: { project?: string; type?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const type = opts.type ? [opts.type] : undefined;
        const d = await sdk.domains.create(projectId, domain, 'manual', undefined, type) as any;
        console.log(`✓ Created domain ${d.id}: ${d.domain}`);
      } catch (e) {
        die(`Create failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('get-dns-records <domainId>')
    .description('List required DNS records for a domain')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const res = await sdk.domains.getDnsRecords(projectId, domainId);
        const rows = (res.records ?? []).map((r: any) => ({
          name: r.name,
          type: r.type,
          value: String(r.value ?? '').slice(0, 60),
          ttl: r.ttl ?? '—',
          category: r.category,
        }));
        printTable(rows, program.opts().output ?? 'table');
      } catch (e) {
        die(`DNS records failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('check-health <domainId>')
    .description('Get latest health check for a domain')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      const projectId = opts.project ?? die('No project ID (--project)');
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        const h = await sdk.domains.getHealth(projectId, domainId);
        if (!h) {
          console.log('No health check run yet — trigger one via the dashboard.');
          return;
        }
        console.log(`Status:        ${h.status ?? '—'}`);
        console.log(`Score:         ${h.score ?? '—'}/100`);
        console.log(`DNS:           ${h.dnsOk ? '✓' : '✗'}`);
        console.log(`Routing:       ${h.routingOk ? '✓' : '✗'}`);
        console.log(`SSL:           ${h.sslOk ? '✓' : '✗'}`);
        console.log(`Email:         ${h.emailOk ? '✓' : '✗'}`);
        console.log(`Latency:       ${h.responseTimeMs ?? '—'}ms`);
        console.log(`SSL expires in: ${h.sslExpiresInDays ?? '—'} days`);
        if (h.errorMessage) console.log(`Error:         ${h.errorMessage}`);
      } catch (e) {
        die(`Health check failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('delete <domainId>')
    .description('Delete a domain')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (domainId: string, opts: { project?: string; yes?: boolean }) => {
      if (!cfg.apiUrl) die('No API URL configured');
      const apiKey = getApiKey() ?? die('Not logged in');
      if (!opts.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => rl.question(`Delete domain ${domainId}? [y/N] `, resolve));
        rl.close();
        if (answer.toLowerCase() !== 'y') { console.log('Cancelled.'); return; }
      }
      const { createFidscript } = await import('@fidscript-deploy/sdk');
      const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
      try {
        await sdk.domains.delete(domainId);
        console.log(`✓ Deleted domain ${domainId}`);
      } catch (e) {
        die(`Delete failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(domainsCmd);

  await program.parseAsync(argv);
}

run(process.argv).catch(e => { console.error(e); process.exit(1); });
