/**
 * CLI email — write commands (send, send-template).
 * Extracted from email.ts to keep each module under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext, die, loadSdk } from './email-helpers';

export type { CliContext };

interface SendOptions {
  to?: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: string;
  project?: string;
  vars?: string;
}

export function addEmailSendCommands(emailCmd: Command, ctx: CliContext): void {
  emailCmd
    .command('send')
    .description('Send a transactional email')
    .requiredOption('-t, --to <email>', 'Recipient address')
    .requiredOption('-s, --subject <subject>', 'Subject line')
    .option('--from <email>', 'Sender address')
    .option('--text <body>', 'Plain text body')
    .option('--html <body>', 'HTML body')
    .option('--reply-to <email>', 'Reply-To address')
    .option('-p, --project <id>', 'Project ID')
    .action(async (opts: SendOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const result = await sdk.email.send(projectId, {
          to: opts.to ?? '',
          from: opts.from,
          subject: opts.subject ?? '',
          text: opts.text,
          html: opts.html,
          replyTo: opts.replyTo,
        });
        console.log(`✓ Email queued: ${result.messageId} → ${opts.to} (status: ${result.status})`);
      } catch (e) { die(`Send failed: ${(e as Error).message}`); }
    });

  emailCmd
    .command('send-template <templateId>')
    .description('Send a templated email')
    .requiredOption('-t, --to <email>', 'Recipient address')
    .option('-v, --vars <json>', 'Template variables as JSON', '{}')
    .option('--from <email>', 'Override sender address')
    .option('-p, --project <id>', 'Project ID')
    .action(async (templateId: string, opts: SendOptions) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      let variables: Record<string, string>;
      try { variables = JSON.parse(opts.vars ?? '{}'); }
      catch { die('--vars must be valid JSON, e.g. \'{"name":"John"}\''); }
      try {
        const result = await sdk.email.sendTemplated(projectId, templateId, {
          to: opts.to ?? '',
          from: opts.from,
          variables,
        });
        console.log(`✓ Templated email sent: ${result.messageId} → ${opts.to}`);
      } catch (e) { die(`Send failed: ${(e as Error).message}`); }
    });
}