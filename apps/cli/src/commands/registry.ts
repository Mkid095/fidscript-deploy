/**
 * CLI commands — registry.
 *
 * The FIDScript npm registry (registry.fidscript.com), driven from the
 * terminal: who am I, what have I published, what is out there, and how do
 * I publish again.
 *
 * This is the CLI's own client of the registry. It does not go through the
 * MCP server — the registry speaks HTTP, and a person at a terminal should
 * not have to speak MCP to it.
 */
import { Command } from 'commander';
import { print } from '../utils/output';
import { registryUrl, readRegistryToken } from './registry-auth';
import {
  getPackument,
  listMyPackages,
  listVersions,
  searchPackages,
  whoami,
  type RegistryClient,
} from './registry-client';
import { registerRegistryWriteCommands } from './registry-write';
import { findGuide } from './registry-guide';

export interface RegistryCliContext {
  loadConfig(): { apiUrl?: string; outputFormat?: string; currentProject?: string };
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

/** A client for the registry, or a clear reason why there is not one. */
export function registryClient(): RegistryClient {
  const token = readRegistryToken();
  if (!token) {
    die(
      'No registry token. Set FIDScript_REGISTRY_TOKEN, or run: fidscript registry login --token <your token>',
    );
  }
  return { registryUrl: registryUrl(), token };
}

export function registerRegistryCommands(program: Command, ctx: RegistryCliContext): void {
  const registry = new Command('registry');
  registry.description('Publish to and inspect the FIDScript npm registry');
  const format = (): 'table' | 'json' | 'raw' =>
    (ctx.loadConfig().outputFormat as 'table' | 'json' | 'raw') ?? 'table';

  registry.command('whoami')
    .description('Show which registry account the token belongs to')
    .action(async () => {
      try {
        const username = await whoami(registryClient());
        print({ registry: registryUrl(), username }, format());
      } catch (e) {
        die((e as Error).message);
      }
    });

  registry.command('list')
    .description('List the packages your account owns')
    .action(async () => {
      try {
        const packages = await listMyPackages(registryClient());
        print(packages.map((name) => ({ package: name })), format(), ['package']);
      } catch (e) {
        die((e as Error).message);
      }
    });

  registry.command('versions <package>')
    .description('List the published versions of a package')
    .action(async (name: string) => {
      try {
        const versions = await listVersions(registryClient(), name);
        print(versions.map((version) => ({ package: name, version })), format(), [
          'package',
          'version',
        ]);
      } catch (e) {
        die((e as Error).message);
      }
    });

  registry.command('search <query>')
    .description('Search the registry')
    .option('--limit <n>', 'How many results to show', '20')
    .action(async (query: string, opts: { limit: string }) => {
      try {
        const results = await searchPackages(registryClient(), query, parseInt(opts.limit, 10) || 20);
        print(results, format(), ['name', 'version', 'description']);
      } catch (e) {
        die((e as Error).message);
      }
    });

  registry.command('info <package>')
    .description('Show a package: its tags, versions and description')
    .action(async (name: string) => {
      try {
        const packument = await getPackument(registryClient(), name);
        print(
          {
            name: packument.name,
            description: packument.description ?? '',
            tags: packument['dist-tags'] ?? {},
            versions: Object.keys(packument.versions ?? {}),
          },
          format(),
        );
      } catch (e) {
        die((e as Error).message);
      }
    });

  registry.command('guide [tool]')
    .description('Show how to install from and publish to the registry (npm, pnpm, yarn, vercel, github-actions, cli)')
    .action((tool: string | undefined) => {
      const guides = findGuide(tool);
      if (Array.isArray(guides)) {
        if (guides.length === 0) die(`No guide for "${tool}".`);
        for (const guide of guides) {
          console.log(`\n${guide.tool} — ${guide.summary}`);
          for (const step of guide.steps) console.log(`  ${step}`);
        }
        return;
      }
      console.log(`\n${guides.tool} — ${guides.summary}`);
      for (const step of guides.steps) console.log(`  ${step}`);
    });

  registerRegistryWriteCommands(registry);

  program.addCommand(registry);
}
