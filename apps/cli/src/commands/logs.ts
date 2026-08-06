/**
 * CLI command — `logs tail` streams live logs.
 * Extracted from bin/fidscript.ts to keep the entry point under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext, die, loadSdk } from './cli-runtime-helpers';

export type { CliContext };

export function addLogsCommand(program: Command, ctx: CliContext): void {
  program
    .command('logs tail')
    .description('Tail live logs (Ctrl+C to stop)')
    .option('-p, --project <id>', 'Project ID')
    .option('-s, --stream <name>', 'Stream name', 'default')
    .option('-l, --level <level>', 'Min level', 'info')
    .action(async (opts: { project?: string; stream?: string; level?: string }) => {
      const cfg = ctx.loadConfig();
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? cfg.currentProject
        ?? die('No project ID (--project or set currentProject in config)');
      console.log(`Tailing logs for project ${projectId}...`);
      try {
        for await (const entry of sdk.logs.streamLogs(projectId, {
          stream: opts.stream,
          level: opts.level as 'debug' | 'info' | 'warn' | 'error' | 'fatal',
        })) {
          console.log(`[${entry.timestamp}] ${entry.level}: ${entry.message}`);
        }
      } catch (e) {
        die(`Log stream error: ${(e as Error).message}`);
      }
    });
}