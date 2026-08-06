/**
 * CLI commands — deployments.
 * Mirrors sdk.deployments.* methods; follows the patterns in fidscript.ts.
 */
import { Command } from 'commander';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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
  const { createFidscript } = require('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}

export function registerDeploymentsCommands(program: Command, ctx: CliContext): void {
  const dep = new Command('deployments');
  const cfg = ctx.loadConfig();

  dep.command('list')
    .description('List deployments for a project')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project or set currentProject)');
      try {
        const res: any = await sdk.deployments.list(projectId);
        const items: any[] = res?.deployments ?? [];
        const rows = items.map(d => ({
          id: d.id?.slice(0, 12), status: d.status, branch: d.branch ?? '-',
          commit: d.commitSha ? d.commitSha.slice(0, 7) : '-',
          url: d.deploymentUrl ?? '-',
          created: new Date(d.createdAt).toLocaleDateString(),
        }));
        console.log(JSON.stringify(rows, null, 2));
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  dep.command('get <deploymentId>')
    .description('Show deployment details (status, commit, branch, build time, URL)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (deploymentId: string, opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      try {
        const d: any = await sdk.deployments.get(projectId, deploymentId);
        console.log(`ID:           ${d.id}`);
        console.log(`Project:      ${d.projectId}`);
        console.log(`Status:       ${d.status}`);
        console.log(`Branch:       ${d.branch ?? '-'}`);
        console.log(`Commit:       ${d.commitSha ?? '-'}`);
        if (d.commitMessage) console.log(`Message:      ${d.commitMessage}`);
        console.log(`Source:       ${d.sourceType ?? '-'}${d.sourceUrl ? ` (${d.sourceUrl})` : ''}`);
        console.log(`Image:        ${d.imageTag ?? '-'}`);
        console.log(`URL:          ${d.deploymentUrl ?? '-'}`);
        console.log(`Created:      ${d.createdAt}`);
        console.log(`Completed:    ${d.completedAt ?? '(running)'}`);
        if (d.rolledBackToId) console.log(`Rolled back:  ${d.rolledBackToId}`);
        if (d.createdBy) console.log(`Created by:   ${d.createdBy}`);

        const created = d.createdAt ? new Date(d.createdAt).getTime() : 0;
        const completed = d.completedAt ? new Date(d.completedAt).getTime() : Date.now();
        if (created && completed) {
          const ms = completed - created;
          const sec = Math.round(ms / 1000);
          console.log(`Build time:   ${sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`}`);
        }
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });

  dep.command('logs <deploymentId>')
    .description('Fetch recent build/deploy logs')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .option('-f, --follow', 'Poll for new logs every 2s (until Ctrl+C)', false)
    .option('--lines <n>', 'Number of trailing lines to keep on follow', '200')
    .action(async (deploymentId: string, opts: { project?: string; follow?: boolean; lines?: string }) => {
      const sdk = await loadSdk(ctx);
      const projectId = opts.project ?? die('No project ID (--project)');
      const printOnce = (logs: string) => {
        if (!logs) console.log('(no logs yet)');
        else process.stdout.write(logs.endsWith('\n') ? logs : `${logs}\n`);
      };

      try {
        if (!opts.follow) {
          const res: any = await sdk.deployments.getLogs(projectId, deploymentId);
          printOnce(typeof res === 'string' ? res : (res?.logs ?? ''));
          return;
        }

        let lastLen = 0;
        const keep = parseInt(opts.lines ?? '200', 10);
        console.log(`Following deployment ${deploymentId} (Ctrl+C to stop)...`);
        const interval = setInterval(async () => {
          try {
            const res: any = await sdk.deployments.getLogs(projectId, deploymentId);
            const full: string = typeof res === 'string' ? res : (res?.logs ?? '');
            if (full.length > lastLen) {
              process.stdout.write(full.slice(lastLen));
              lastLen = full.length;
            } else if (full.length < lastLen) {
              // logs rotated (e.g. truncated by server); reset and reprint last N
              const lines = full.split('\n');
              const tail = lines.slice(-keep).join('\n');
              process.stdout.write('\n--- log rotated ---\n' + tail + '\n');
              lastLen = full.length;
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

  program.addCommand(dep);
}
