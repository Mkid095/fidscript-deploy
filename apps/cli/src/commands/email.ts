/**
 * CLI commands — email (transactional email via Stalwart).
 * Mirrors sdk.email.* methods. Send subcommands live in email-send.ts;
 * read subcommands (inbox, status, templates, domains, analytics) live in
 * email-list.ts. This orchestrator stays under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext } from './email-helpers';
import { addEmailSendCommands } from './email-send';
import { addEmailListCommands } from './email-list';

export type { CliContext };

export function registerEmailCommands(program: Command, ctx: CliContext): void {
  const emailCmd = new Command('email');
  const cfg = ctx.loadConfig();
  const output = (program.opts().output as string) ?? cfg.outputFormat ?? 'table';

  addEmailSendCommands(emailCmd, ctx);
  addEmailListCommands(emailCmd, ctx, output);

  program.addCommand(emailCmd);
}