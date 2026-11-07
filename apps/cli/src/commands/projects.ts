/**
 * CLI commands — projects.
 * Mirrors sdk.projects.* methods; follows the patterns in fidscript.ts.
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

export function registerProjectsCommands(program: Command, ctx: CliContext): void {
  const projects = new Command('projects');
  const cfg = ctx.loadConfig();

  projects.command('list')
    .description('List all projects you have access to')
    .action(async () => {
      const sdk = await loadSdk(ctx);
      try {
        const res: any = await sdk.projects.list();
        const items = res.projects ?? res;
        const rows = items.map((p: any) => ({
          id: p.id?.slice(0, 12), name: p.name, status: p.status,
          region: p.region ?? '-', lastDeploy: p.lastDeployAt ?? '-',
          role: p.role ?? '-',
        }));
        console.log(JSON.stringify(rows, null, 2));
      } catch (e) { die(`List failed: ${(e as Error).message}`); }
    });

  projects.command('create <name>')
    .description('Create a new project')
    .option('--type <type>', 'Project type', 'frontend')
    .action(async (name: string, opts: { type?: string }) => {
      const sdk = await loadSdk(ctx);
      try {
        const p: any = await sdk.projects.create({ name, type: opts.type ?? 'frontend' });
        console.log(`Created project ${p.id}: ${p.name}`);
      } catch (e) { die(`Create failed: ${(e as Error).message}`); }
    });

  projects.command('get <projectId>')
    .description('Show project details, members, and service summary')
    .action(async (projectId: string) => {
      const sdk = await loadSdk(ctx);
      try {
        const p: any = await sdk.projects.get(projectId);
        console.log(`Name:         ${p.name}`);
        console.log(`ID:           ${p.id}`);
        console.log(`Slug:         ${p.slug ?? '-'}`);
        console.log(`Type:         ${p.type}`);
        console.log(`Status:       ${p.status}`);
        console.log(`Region:       ${p.region ?? '-'}`);
        console.log(`Owner:        ${p.ownerId}`);
        console.log(`Created:      ${p.createdAt}`);
        console.log(`Updated:      ${p.updatedAt}`);
        if (p.lastActivityAt) console.log(`Last active:  ${p.lastActivityAt}`);
        if (p.lastDeployAt) console.log(`Last deploy:  ${p.lastDeployAt}`);
        if (p.description) console.log(`Description:  ${p.description}`);

        // Service status summary — best-effort; missing modules don't fail the whole get
        const services: Array<{ name: string; status: string; count?: number }> = [];
        try {
          const dbs: any[] = await sdk.databases.list(projectId);
          services.push({
            name: 'databases', status: dbs.some(d => d.status === 'available') ? 'healthy' : 'degraded',
            count: dbs.length,
          });
        } catch { services.push({ name: 'databases', status: 'unknown' }); }
        try {
          const fns: any[] = await sdk.functions.list(projectId);
          services.push({
            name: 'functions', status: fns.some(f => f.status === 'active') ? 'healthy' : 'degraded',
            count: fns.length,
          });
        } catch { services.push({ name: 'functions', status: 'unknown' }); }
        try {
          const depRes: any = await sdk.deployments.list(projectId);
          const deps: any[] = depRes?.deployments ?? [];
          services.push({
            name: 'deployments', status: deps.some(d => d.status === 'live') ? 'healthy' : 'degraded',
            count: deps.length,
          });
        } catch { services.push({ name: 'deployments', status: 'unknown' }); }

        console.log(`\nServices:`);
        for (const s of services) {
          const suffix = typeof s.count === 'number' ? ` (${s.count})` : '';
          console.log(`  ${s.name.padEnd(12)} ${s.status}${suffix}`);
        }

        // Member count
        try {
          const members: any[] = await sdk.projects.listMembers(projectId);
          console.log(`\nMembers:      ${members.length}`);
          for (const m of members.slice(0, 10)) {
            console.log(`  - ${m.email} (${m.role})`);
          }
          if (members.length > 10) console.log(`  ... and ${members.length - 10} more`);
        } catch { /* membership lookup is optional */ }
      } catch (e) { die(`Get failed: ${(e as Error).message}`); }
    });

  void cfg; // currentProject reserved for future project-scoped subcommands
  program.addCommand(projects);
}
