/**
 * CLI functions — `functions logs` subcommand (recent invocations + --follow stream).
 * Imported by apps/cli/src/commands/functions.ts.
 */
import type { Command } from 'commander';
import { die, loadSdk } from './functions-helpers';
import type { CliContext } from './functions-helpers';

export function addFunctionLogsCommand(fn: Command, ctx: CliContext): void {
  fn.command('logs <functionId>')
    .description('Show recent function invocation logs')
    .option('-p, --project <id>', 'Project ID', ctx.loadConfig().currentProject ?? '')
    .option('-l, --limit <n>', 'Number of entries', (v) => parseInt(v, 10))
    .option('-f, --follow', 'Stream new logs live until Ctrl+C', false)
    .action(async (functionId: string, opts: { project?: string; limit?: number; follow?: boolean }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const print = (entries: any[]) => {
        if (!entries.length) { console.log('(no logs yet)'); return; }
        for (const e of entries) {
          const ts = new Date(e.timestamp).toLocaleTimeString();
          console.log(`[${ts}] ${e.level?.toUpperCase() ?? 'INFO'} ${e.message}`);
        }
      };

      try {
        if (!opts.follow) {
          const logs = await sdk.functions.getLogs(projectId, functionId, opts.limit ?? 50);
          print(logs);
          return;
        }

        // --follow: poll getLogs at 2s; streamLogs is SSE which complicates shutdown across engines
        let lastTimestamp: string | null = null;
        console.log(`Streaming logs for function ${functionId} (Ctrl+C to stop)...`);
        const interval = setInterval(async () => {
          try {
            const logs = await sdk.functions.getLogs(projectId, functionId, 200);
            const newOnes = logs.filter((l: any) => !lastTimestamp || l.timestamp > lastTimestamp);
            if (newOnes.length) {
              print(newOnes);
              lastTimestamp = newOnes[newOnes.length - 1].timestamp;
            }
          } catch (e) {
            console.error(`Poll failed: ${(e as Error).message}`);
          }
        }, 2000);

        const stop = () => { clearInterval(interval); process.exit(0); };
        process.on('SIGINT', stop);
        process.on('SIGTERM', stop);
      } catch (e) { die(`Logs fetch failed: ${(e as Error).message}`); }
    });
}
