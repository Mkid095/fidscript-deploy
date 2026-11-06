/**
 * CLI commands — registry, the write half.
 *
 * Logging in, publishing, and taking a version back down. Every one of these
 * needs a token, and every one of them is confirmed before it does anything
 * irreversible.
 */
import { Command } from 'commander';
import { registryUrl, readRegistryToken, saveRegistryCredential, clearRegistryCredential } from './registry-auth';
import { whoami } from './registry-client';
import { packPackage, publishPackage, removePackage, unpublishVersion } from './registry-publish';

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function tokenOrDie(): string {
  const token = readRegistryToken();
  if (!token) die('No registry token — run: fidscript registry login --token <your token>');
  return token;
}

export function registerRegistryWriteCommands(registry: Command): void {
  registry
    .command('login')
    .description('Store a registry token in ~/.fidscript/registry.json')
    .option('--token <token>', 'The token to store')
    .action(async (opts: { token?: string }) => {
      const token = opts.token ?? process.env.FIDScript_REGISTRY_TOKEN ?? process.env.NPM_TOKEN;
      if (!token) {
        die('No token given — pass --token <your token>, or set FIDScript_REGISTRY_TOKEN');
      }
      try {
        const username = await whoami({ registryUrl: registryUrl(), token });
        saveRegistryCredential({ token, username, registryUrl: registryUrl() });
        console.log(`Signed in to ${registryUrl()} as ${username}.`);
      } catch (e) {
        die(`The registry rejected that token: ${(e as Error).message}`);
      }
    });

  registry
    .command('logout')
    .description('Remove the stored registry token')
    .action(() => {
      clearRegistryCredential();
      console.log('Registry token removed.');
    });

  registry
    .command('publish [dir]')
    .description('Publish a package to the registry')
    .option('--tag <tag>', 'The dist-tag to publish under')
    .option('--access <access>', 'public or restricted')
    .option('--dry-run', 'Show what npm would publish, without publishing it')
    .action((dir: string | undefined, opts: { tag?: string; access?: string; dryRun?: boolean }) => {
      const options = {
        registryUrl: registryUrl(),
        token: tokenOrDie(),
        dir: dir ?? process.cwd(),
        tag: opts.tag,
        access: opts.access as 'public' | 'restricted' | undefined,
      };
      const result = opts.dryRun ? packPackage(options) : publishPackage(options);
      if (!result.ok) die(result.output || 'The publish failed.');
      console.log(result.output || 'Published.');
    });

  registry
    .command('unpublish <package@version>')
    .description('Remove one published version of a package')
    .action((spec: string) => {
      const result = unpublishVersion(
        { registryUrl: registryUrl(), token: tokenOrDie() },
        spec,
      );
      if (!result.ok) die(result.output || 'The unpublish failed.');
      console.log(result.output || `Removed ${spec}.`);
    });

  registry
    .command('remove <package>')
    .description('Remove a whole package from the registry')
    .action((name: string) => {
      const result = removePackage({ registryUrl: registryUrl(), token: tokenOrDie() }, name);
      if (!result.ok) die(result.output || 'The removal failed.');
      console.log(result.output || `Removed ${name}.`);
    });
}
