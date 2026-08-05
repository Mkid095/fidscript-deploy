/**
 * CLI commands — domains (custom domains + DNS + health).
 * Mirrors sdk.domains.* methods.
 */
import { Command } from 'commander';
import { createInterface } from 'readline';

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
  const { createFidscript } = await import('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}

async function confirmDelete(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(prompt, resolve));
  rl.close();
  return answer.toLowerCase() === 'y';
}

async function printTable(rows: Record<string, unknown>[], fmt: string): Promise<void> {
  const { print } = await import('../utils/output');
  print(rows, fmt as 'table' | 'json' | 'raw');
}

export function registerDomainsCommands(program: Command, ctx: CliContext): void {
  const domainsCmd = new Command('domains');
  const cfg = ctx.loadConfig();
  const output = (program.opts().output as string) ?? cfg.outputFormat ?? 'table';

  domainsCmd
    .command('list')
    .description('List domains in a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const list = await sdk.domains.list(projectId);
        const rows = list.map((d: any) => ({
          domain: d.domain,
          type: Array.isArray(d.type) ? d.type.join(',') : (d.type ?? '—'),
          status: d.sslStatus ?? '—',
          registered: d.dnsStatus ?? '—',
          expires: d.sslExpiresAt ? new Date(d.sslExpiresAt).toLocaleDateString() : '—',
        }));
        await printTable(rows, output);
      } catch (e) {
        die(`List failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('get <domainId>')
    .description('Get a domain by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      try {
        const d = await sdk.domains.get(domainId) as any;
        console.log(`Domain:      ${d.domain}`);
        console.log(`ID:          ${d.id}`);
        console.log(`Type:        ${Array.isArray(d.type) ? d.type.join(',') : d.type}`);
        console.log(`DNS status:  ${d.dnsStatus}`);
        console.log(`SSL status:  ${d.sslStatus}`);
        console.log(`SSL enabled: ${d.sslEnabled ? '✓' : '✗'}`);
        console.log(`SSL expires: ${d.sslExpiresAt ?? '—'}`);
        console.log(`DNS mode:    ${d.dnsMode}`);
        console.log(`Custom:      ${d.isCustom ? '✓' : '✗'}`);
        console.log(`Primary:     ${d.isPrimary ? '✓' : '✗'}`);
        console.log(`Apex:        ${d.apexDomain ? '✓' : '✗'}`);
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
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const type = opts.type ? [opts.type as any] : undefined;
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
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const res = await sdk.domains.getDnsRecords(projectId, domainId);
        const rows = (res.records ?? []).map((r: any) => ({
          name: r.name,
          type: r.type,
          value: String(r.value ?? '').slice(0, 60),
          ttl: r.ttl ?? '—',
          category: r.category,
        }));
        await printTable(rows, output);
      } catch (e) {
        die(`DNS records failed: ${(e as Error).message}`);
      }
    });

  domainsCmd
    .command('check-health <domainId>')
    .description('Get latest health check for a domain')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
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
      if (!opts.yes && !(await confirmDelete(`Delete domain ${domainId}? [y/N] `))) {
        console.log('Cancelled.');
        return;
      }
      const sdk = await loadSdk(ctx);
      try {
        await sdk.domains.delete(domainId);
        console.log(`✓ Deleted domain ${domainId}`);
      } catch (e) {
        die(`Delete failed: ${(e as Error).message}`);
      }
    });

  program.addCommand(domainsCmd);
}
