/**
 * CLI commands — fidscript registry link / unlink.
 *
 * The registry account, tied to the platform user: one login, two systems.
 * `link` asks the platform to mint (or re-mint) the user's registry token
 * and stores it where `fidscript registry publish` already reads it. The
 * platform keeps the password; the machine keeps the token.
 *
 * It is a *platform* action (it authenticates with the account token), so it
 * sits under the `registry` group but uses the platform credential, not the
 * registry one.
 */
import { Command } from 'commander';
import { FidscriptClient } from '@fidscript-deploy/sdk';
import { die, CliContext } from './cli-runtime-helpers';
import { saveRegistryCredential, clearRegistryCredential, registryUrl, readRegistryToken } from './registry-auth';

interface Linked {
  registryUrl: string;
  registryUser: string;
  registryToken: string;
  linked: boolean;
}

export function registerRegistryAccountCommands(registry: Command, ctx: CliContext): void {
  registry
    .command('link')
    .description('Link this user’s registry account (one login reaches both)')
    .action(async () => {
      const apiKey = ctx.getApiKey() ?? die('Not logged in — run `fidscript login` first');
      if (!ctx.apiUrl) die('No API URL configured — run `fidscript configure`');
      const client = new FidscriptClient({ apiKey, baseURL: ctx.apiUrl });
      const linked = await client
        .post<Linked>('/api/v1/auth/registry/link')
        .catch((e) => die(`Registry link failed: ${(e as Error).message}`));
      saveRegistryCredential({
        token: linked.registryToken,
        username: linked.registryUser,
        registryUrl: linked.registryUrl,
      });
      console.log(`Registry linked as ${linked.registryUser} at ${linked.registryUrl}`);
      console.log('The token is stored where `fidscript registry publish` reads it.');
    });

  registry
    .command('unlink')
    .description('Unlink the registry account and revoke its issued tokens')
    .action(async () => {
      const apiKey = ctx.getApiKey() ?? die('Not logged in — run `fidscript login` first');
      if (!ctx.apiUrl) die('No API URL configured — run `fidscript configure`');
      const client = new FidscriptClient({ apiKey, baseURL: ctx.apiUrl });
      const result = await client
        .delete<{ linked: boolean; revoked: boolean; registryUser?: string; note?: string }>('/api/v1/auth/registry')
        .catch((e) => die(`Unlink failed: ${(e as Error).message}`));
      clearRegistryCredential();
      if (result?.revoked) {
        console.log(`Registry account ${result.registryUser ?? ''} unlinked — its issued tokens were revoked and the local copy cleared.`);
      } else {
        console.log('Registry account unlinked on the platform and the local copy cleared.');
      }
      if (result?.note) {
        console.log(`Note: ${result.note}`);
      }
    });

  registry
    .command('status')
    .description('Is a registry token stored here, and is the platform link active?')
    .action(async () => {
      const local = readRegistryToken();
      console.log(`Local registry token: ${local ? 'stored' : 'none'}${local ? ` (registry ${registryUrl()})` : ''}`);
      const apiKey = ctx.getApiKey();
      if (!apiKey) {
        console.log('Platform link: not checked (no platform token). Run `fidscript login`.');
        return;
      }
      const client = new FidscriptClient({ apiKey, baseURL: ctx.apiUrl ?? die('No API URL') });
      const status = await client
        .get<{ linked: boolean; registryUser?: string; lastUsedAt?: string | null }>('/api/v1/auth/registry')
        .catch(() => ({ linked: false, registryUser: undefined }));
      console.log(`Platform link: ${status.linked ? `linked as ${status.registryUser}` : 'not linked'}`);
    });
}
