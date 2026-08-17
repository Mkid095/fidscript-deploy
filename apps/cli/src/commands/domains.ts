/**
 * CLI commands — domains (custom domains + DNS + health).
 * Mirrors sdk.domains.* methods.
 */
import { Command } from 'commander';
import {
  CliContext,
  die,
  loadSdk,
  printTable,
  confirmDelete,
} from './domains-helpers';
import { validateDomainName, validateDomainType } from './domains-validate';
import type { DomainType } from '@fidscript-deploy/sdk';

export { die, loadSdk };
export type { CliContext };

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
        const rows = (list as unknown as Array<Record<string, unknown>>).map((d) => ({
          domain: String(d.domain ?? ''),
          type: Array.isArray(d.type) ? d.type.join(',') : (d.type ? String(d.type) : '—'),
          status: d.sslStatus ? String(d.sslStatus) : '—',
          registered: d.dnsStatus ? String(d.dnsStatus) : '—',
          expires: d.sslExpiresAt ? new Date(String(d.sslExpiresAt)).toLocaleDateString() : '—',
        }));
        await printTable(rows, output);
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  domainsCmd
    .command('get <domainId>')
    .description('Get a domain by ID')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, _opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      try {
        const d = (await sdk.domains.get(domainId)) as unknown as Record<string, unknown>;
        const fields: Array<[string, unknown]> = [
          ['Domain', d.domain], ['ID', d.id],
          ['Type', Array.isArray(d.type) ? d.type.join(',') : d.type],
          ['DNS status', d.dnsStatus], ['SSL status', d.sslStatus],
          ['SSL enabled', d.sslEnabled ? '✓' : '✗'], ['SSL expires', d.sslExpiresAt ?? '—'],
          ['DNS mode', d.dnsMode],
          ['Custom', d.isCustom ? '✓' : '✗'], ['Primary', d.isPrimary ? '✓' : '✗'],
          ['Apex', d.apexDomain ? '✓' : '✗'],
        ];
        for (const [k, v] of fields) console.log(`${k.padEnd(13)} ${String(v ?? '')}`);
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });

  domainsCmd
    .command('create <domain>')
    .description('Add a domain to a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('--type <type>', 'Domain type (DEPLOYMENT, EMAIL, API, BOTH)')
    .action(async (domain: string, opts: { project?: string; type?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const validated = validateDomainName(domain);
      const type = validateDomainType(opts.type);
      try {
        const d = (await sdk.domains.create(
          projectId, validated, 'manual', undefined, type ? [type] as DomainType[] : undefined,
        )) as unknown as Record<string, unknown>;
        console.log(`✓ Created domain ${String(d.id ?? '')}: ${String(d.domain ?? '')}`);
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  domainsCmd
    .command('get-dns-records <domainId>')
    .description('List required DNS records for a domain')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const res = (await sdk.domains.getDnsRecords(projectId, domainId)) as unknown as { records?: Array<Record<string, unknown>> };
        const rows = (res.records ?? []).map((r) => ({
          name: String(r.name ?? ''),
          type: String(r.type ?? ''),
          value: String(r.value ?? '').slice(0, 60),
          ttl: r.ttl ? String(r.ttl) : '—',
          category: String(r.category ?? ''),
        }));
        await printTable(rows, output);
      } catch (e) { die(`DNS records failed: ${(e as Error).message}`); }
    });

  domainsCmd
    .command('check-health <domainId>')
    .description('Get latest health check for a domain')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (domainId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const h = (await sdk.domains.getHealth(projectId, domainId)) as unknown as Record<string, unknown> | null;
        if (!h) {
          console.log('No health check run yet — trigger one via the dashboard.');
          return;
        }
        const fields: Array<[string, unknown]> = [
          ['Status', h.status ?? '—'], ['Score', h.score ? `${h.score}/100` : '—'],
          ['DNS', h.dnsOk ? '✓' : '✗'], ['Routing', h.routingOk ? '✓' : '✗'],
          ['SSL', h.sslOk ? '✓' : '✗'], ['Email', h.emailOk ? '✓' : '✗'],
          ['Latency', h.responseTimeMs ? `${String(h.responseTimeMs)}ms` : '—'],
          ['SSL expires in', h.sslExpiresInDays ? `${String(h.sslExpiresInDays)} days` : '—'],
        ];
        for (const [k, v] of fields) console.log(`${k.padEnd(15)} ${String(v ?? '')}`);
        if (h.errorMessage) console.log(`Error:         ${String(h.errorMessage)}`);
      } catch (e) { die(`Health check failed: ${(e as Error).message}`); }
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
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        await sdk.domains.delete(projectId, domainId);
        console.log(`✓ Deleted domain ${domainId}`);
      } catch (e) { die(`Delete failed: ${(e as Error).message}`); }
    });

  program.addCommand(domainsCmd);
}