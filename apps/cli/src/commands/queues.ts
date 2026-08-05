/**
 * CLI commands — queues (managed message queues over NATS JetStream).
 * Mirrors sdk.queues.* methods. Subcommands live in queue-read.ts and
 * queue-write.ts; helpers in queue-helpers.ts. Split keeps this orchestrator
 * under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext, loadSdk } from './queue-helpers';
import { addQueueReadCommands } from './queue-read';
import { addQueueWriteCommands } from './queue-write';

export { loadSdk };
export type { CliContext } from './queue-helpers';

export function registerQueuesCommands(program: Command, ctx: CliContext): void {
  const queues = new Command('queues');
  const cfg = ctx.loadConfig();
  const output = (program.opts().output as string) ?? cfg.outputFormat ?? 'table';

  // Make --project default to the currentProject from config
  queues.option('-p, --project <id>', 'Project ID (default: currentProject)', cfg.currentProject ?? '');

  addQueueReadCommands(queues, ctx, cfg, output);
  addQueueWriteCommands(queues, ctx);

  program.addCommand(queues);
}
