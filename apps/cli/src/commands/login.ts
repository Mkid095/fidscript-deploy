/**
 * CLI command — fidscript login.
 *
 * Two ways in:
 *   fidscript login           email + password → mint a durable access token,
 *                              link the registry account, store both locally.
 *   fidscript login <key>     store a raw token (a dashboard-created fsk_ key,
 *                              or the old-style key) as the active credential.
 *
 * The interactive path is the "one login reaches everything" flow: a short
 * session proves the password (and MFA, when enrolled), mints a revocable
 * account token, and links the registry so the user keeps one set of
 * credentials, not two.
 */
import { Command } from 'commander';
import { hostname } from 'node:os';
import { createFidscript, FidscriptClient } from '@fidscript-deploy/sdk';
import { ask, askSecret } from '../utils/prompt';
import { loadConfig, saveConfig, addKey, setApiKey } from '../config/index';
import { saveRegistryCredential } from './registry-auth';
import { configureNpmrc, MANAGED_SCOPES } from './registry-npmrc';

export interface LoginContext {
  apiUrl?: string;
}

interface LoginOpts {
  name?: string;
  scope?: string[];
  expires?: string;
  /** Present when --no-registry is NOT passed (commander's negation). */
  registry?: boolean;
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function short(err: unknown): string {
  return (err as { message?: string })?.message ?? String(err);
}

function daysToIso(days: string): string {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) die(`--expires must be a positive number of days`);
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

export async function runInteractiveLogin(ctx: LoginContext, opts: LoginOpts): Promise<void> {
  const cfg = loadConfig();
  let apiUrl = cfg.apiUrl ?? ctx.apiUrl;
  if (!apiUrl) {
    apiUrl = (await ask('API URL (e.g. https://api.fidscript.com)')).replace(/\/+$/, '');
    if (!apiUrl) die('An API URL is required to log in');
    saveConfig({ ...cfg, apiUrl });
  }

  const email = await ask('Email');
  if (!email) die('An email is required');
  const password = await askSecret('Password');
  if (!password) die('A password is required');

  // A session with no stored credential: the sign-in itself.
  const anon = createFidscript({ baseURL: apiUrl });
  const loginRes = await anon
    .auth.login(email, password)
    .catch((e) => die(`Login failed: ${short(e)}`));

  // MFA, when the account has it on: the challenge is the second half.
  let accessToken: string;
  if ('mfaToken' in loginRes) {
    const code = await ask('One-time code');
    if (!code) die('A one-time code is required');
    const done = await anon.auth.mfaChallenge(loginRes.mfaToken, code).catch((e) => die(`MFA failed: ${short(e)}`));
    accessToken = done.accessToken;
  } else {
    accessToken = loginRes.accessToken;
  }

  // Mint the durable, revocable token this machine will use from here on.
  const keyName = opts.name ?? `cli-${hostname()}`;
  const session = createFidscript({ baseURL: apiUrl, apiKey: accessToken });
  const created = await session
    .auth.createApiKey(keyName, opts.scope?.length ? opts.scope : undefined, opts.expires ? daysToIso(opts.expires) : undefined)
    .catch((e) => die(`Could not create the access token: ${short(e)}`));
  addKey(keyName, created.key);

  // Link the registry account so the user keeps one credential, not two.
  let registryNote: string;
  if (opts.registry === false) {
    registryNote = 'Registry: not linked (--no-registry)';
  } else {
    try {
      const raw = new FidscriptClient({ apiKey: created.key, baseURL: apiUrl });
      const linked = await raw.post<{
        registryUrl: string;
        registryUser: string;
        registryToken: string;
        linked: boolean;
      }>('/api/v1/auth/registry/link');
      saveRegistryCredential({
        token: linked.registryToken,
        username: linked.registryUser,
        registryUrl: linked.registryUrl,
      });
      // The link's other half: point npm itself at the registry, so a plain
      // `npm install @fidscript-deploy/…` resolves from it, not from
      // whatever default registry the machine has.
      configureNpmrc(linked.registryUrl, linked.registryToken);
      registryNote = `Registry: linked as ${linked.registryUser} — npm (${MANAGED_SCOPES.join(', ')}) now resolves from ${linked.registryUrl}`;
    } catch (e) {
      registryNote = `Registry: not linked (${short(e)}). Later: fidscript registry link`;
    }
  }

  console.log('Logged in.');
  console.log(`  User:        ${email}`);
  console.log(`  Token:       ${keyName} (stored and active)`);
  console.log(`  API URL:     ${apiUrl}`);
  console.log(`  ${registryNote}`);
  console.log('\nTry: fidscript projects list');
}

export function addLoginCommand(program: Command, ctx: LoginContext): void {
  program
    .command('login [key]')
    .description(
      'Log in with email + password (mints a token and links the registry), or store a raw token: fidscript login <key>',
    )
    .option('-n, --name <name>', 'Name for the access token')
    .option('--scope <scopes...>', 'Restrict the token to these scopes (repeatable)')
    .option('--expires <days>', 'Token lifetime, in days')
    .option('--no-registry', 'Skip linking the registry account')
    .action(async (key: string | undefined, opts: LoginOpts) => {
      if (key) {
        // The raw path: keep what an existing install does today.
        setApiKey(key);
        console.log('Stored the token as the active credential in ~/.fidscript/');
        return;
      }
      await runInteractiveLogin(ctx, opts);
    });
}
