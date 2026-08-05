/**
 * CLI commands — storage (object storage buckets and files).
 * Mirrors sdk.storage.* methods. Subcommands live in storage-read.ts and
 * storage-write.ts; helpers in storage-helpers.ts. Split keeps this orchestrator
 * under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext, loadSdk } from './storage-helpers';
import { addStorageReadCommands } from './storage-read';
import { addStorageWriteCommands } from './storage-write';

export { loadSdk };
export type { CliContext } from './storage-helpers';

export function registerStorageCommands(program: Command, ctx: CliContext): void {
  const storage = new Command('storage');
  const cfg = ctx.loadConfig();
  const output = (program.opts().output as string) ?? cfg.outputFormat ?? 'table';

  storage.option('-p, --project <id>', 'Project ID (default: currentProject)', cfg.currentProject ?? '');

  addStorageReadCommands(storage, ctx, cfg, output);
  addStorageWriteCommands(storage, ctx);

  program.addCommand(storage);
}
