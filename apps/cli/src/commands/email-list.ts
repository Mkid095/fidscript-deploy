/**
 * CLI email — read commands (inbox, status, templates, domains, analytics).
 * Extracted from email.ts to keep each module under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext, die, loadSdk, printTable } from './email-helpers';

export type { CliContext };

interface ListOptions {
  project?: string;
  limit?: string;
  unread?: boolean;
  days?: string;
}

export function addEmailListCommands(emailCmd: Command, ctx: CliContext, output: string): void {
  emailCmd
    .command('inbox')
    .description('List recent messages')
    .option('-l, --limit <n>', 'Number of messages', '20')
    .option('--unread', 'Show only unread')
    .option('-p, --project <id>', 'Project ID')
    .action(async (opts: ListOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const messages = (await sdk.email.listMessages(projectId, {
          limit: parseInt(opts.limit ?? '20', 10),
          unread: opts.unread,
        })) as unknown as Array<Record<string, unknown>>;
        const rows = messages.map((m) => ({
          id: typeof m.id === 'string' ? m.id.slice(0, 12) : '',
          from: String(m.from ?? ''),
          subject: String(m.subject ?? '').slice(0, 40),
          status: String(m.status ?? ''),
          date: m.createdAt ? new Date(String(m.createdAt)).toLocaleDateString() : '—',
        }));
        await printTable(rows, output);
      } catch (e) { die(`Failed: ${(e as Error).message}`); }
    });

  emailCmd
    .command('status <messageId>')
    .description('Get delivery status for a message')
    .option('-p, --project <id>', 'Project ID')
    .action(async (messageId: string, opts: ListOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const status = await sdk.email.getMessageStatus(projectId, messageId) as { status: string; failureType?: string; retryCount?: number; attempts?: Array<{ attempt: number; status: string; durationMs: number; failureType?: string }> };
        console.log(`Status: ${status.status}`);
        if (status.failureType) console.log(`Failure: ${status.failureType}`);
        console.log(`Attempts: ${status.retryCount}`);
        if (status.attempts?.length) {
          console.log('\nDelivery attempts:');
          for (const a of status.attempts) {
            const tag = a.failureType !== 'NONE' && a.failureType ? ` [${a.failureType}]` : '';
            console.log(`  #${a.attempt}: ${a.status} (${a.durationMs}ms)${tag}`);
          }
        }
      } catch (e) { die(`Failed: ${(e as Error).message}`); }
    });

  emailCmd
    .command('templates')
    .description('List email templates')
    .option('-p, --project <id>', 'Project ID')
    .action(async (opts: ListOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const templates = (await sdk.email.listTemplates(projectId)) as unknown as Array<Record<string, unknown>>;
        const rows = templates.map((t) => ({
          name: String(t.name ?? ''),
          subject: String(t.subject ?? '').slice(0, 40),
          from: t.fromAddress ? String(t.fromAddress) : '—',
          vars: Array.isArray(t.variables) ? t.variables.length : 0,
          active: t.isActive ? '✓' : '✗',
        }));
        await printTable(rows, output);
      } catch (e) { die(`Failed: ${(e as Error).message}`); }
    });

  emailCmd
    .command('domains')
    .description('List email domains')
    .option('-p, --project <id>', 'Project ID')
    .action(async (opts: ListOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const domains = (await sdk.email.listDomains(projectId)) as unknown as Array<Record<string, unknown>>;
        const rows = domains.map((d) => ({
          domain: String(d.domain ?? ''),
          status: String(d.status ?? ''),
          dkim: d.dkimVerified ? '✓' : '✗',
          spf: d.spfVerified ? '✓' : '✗',
          dmarc: d.dmarcVerified ? '✓' : '✗',
          mx: d.mxVerified ? '✓' : '✗',
        }));
        await printTable(rows, output);
      } catch (e) { die(`Failed: ${(e as Error).message}`); }
    });

  emailCmd
    .command('analytics')
    .description('Show email delivery analytics')
    .option('-d, --days <n>', 'Number of days', '30')
    .option('-p, --project <id>', 'Project ID')
    .action(async (opts: ListOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const overview = await sdk.email.getDeliveryOverview(projectId, parseInt(opts.days ?? '30', 10));
        console.log(`\nEmail Analytics (last ${overview.rangeDays} days)\n`);
        console.log(`Total messages: ${overview.total}`);
        console.log(`Delivery rate:  ${(overview.deliveryRate * 100).toFixed(1)}%`);
        console.log(`Bounce rate:    ${(overview.bounceRate * 100).toFixed(1)}%`);
        console.log(`Open rate:      ${(overview.openRate * 100).toFixed(1)}%`);
        console.log(`Click rate:     ${(overview.clickRate * 100).toFixed(1)}%`);
        console.log(`\nStatus breakdown:`);
        for (const [s, c] of Object.entries(overview.byStatus)) {
          if (Number(c) > 0) console.log(`  ${s}: ${c}`);
        }
      } catch (e) { die(`Failed: ${(e as Error).message}`); }
    });
}