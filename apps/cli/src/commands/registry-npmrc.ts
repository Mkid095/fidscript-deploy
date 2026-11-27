/**
 * npm routing — the part of the registry link that npm itself understands.
 *
 * Linking the account hands the CLI a registry token, but a plain
 * `npm install @fidscript-deploy/…` still resolves against npm's default
 * registry. The link therefore also points npm at the registry it minted
 * the token from — two scope lines and the auth line in the user's
 * `.npmrc`:
 *
 *   @fidscript-deploy:registry=https://registry.fidscript.com
 *   @fidscript:registry=https://registry.fidscript.com
 *   //registry.fidscript.com/:_authToken=<token>
 *
 * The scope lines are what route downloads *to our registry, not another*;
 * the auth line is what lets the same npm publish. Only the lines this
 * link owns are touched — every other line in the file (other registries,
 * other scopes) is kept as-is, and the file is written 0600 because it
 * may now carry a token.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { NPMRC_FILE } from './registry-auth';

/** The scopes the link routes to its registry. */
export const MANAGED_SCOPES = ['@fidscript-deploy', '@fidscript'] as const;

export interface NpmrcConfigured {
  /** The registry the scope lines point at. */
  registry: string;
  /** Whether the auth line was written (a link always has one). */
  authWritten: boolean;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

function scopeKeys(): string[] {
  return MANAGED_SCOPES.map((scope) => `${scope}:registry`);
}

function authKey(registry: string): string {
  return `//${hostOf(registry)}/:_authToken`;
}

/**
 * Point npm at the registry the link minted: the managed scope lines are
 * written or replaced, the auth line is written (or, without a token, a
 * stale one for this host is dropped — a token nobody holds is worse than
 * none), everything else is preserved, and the file is left 0600.
 */
export function configureNpmrc(
  registry: string,
  token?: string,
  file: string = NPMRC_FILE,
): NpmrcConfigured {
  const cleanRegistry = registry.replace(/\/+$/, '');
  const cleanToken = token?.trim() || undefined;
  const lines = existsSync(file)
    ? readFileSync(file, 'utf8').split('\n')
    : [];

  const values = new Map<string, string>();
  for (const scope of MANAGED_SCOPES) {
    values.set(`${scope}:registry`, cleanRegistry);
  }
  if (cleanToken) {
    values.set(authKey(cleanRegistry), cleanToken);
  }

  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (values.has(key)) {
      // Ours: replaced below (or dropped, when the key lost its value).
      continue;
    }
    // A stale auth line for this registry, when no token is being written.
    if (!cleanToken && key === authKey(cleanRegistry)) {
      continue;
    }
    out.push(line);
  }

  // Append the managed keys that were not already in the file, in order.
  for (const [key, value] of values) {
    if (!out.some((line) => line.trim().startsWith(`${key}=`))) {
      out.push(`${key}=${value}`);
    }
  }

  writeFileSync(file, out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '\n'), 'utf8');
  chmodSync(file, 0o600);
  return { registry: cleanRegistry, authWritten: Boolean(cleanToken) };
}

/**
 * The unlink's half of the same file: the token the link minted is dead,
 * so its auth line goes. The scope routing stays — public packages still
 * install without a token, and a re-link rewrites the auth line.
 */
export function removeNpmrcAuth(registry: string, file: string = NPMRC_FILE): boolean {
  if (!existsSync(file)) return false;
  const key = authKey(registry.replace(/\/+$/, ''));
  const lines = readFileSync(file, 'utf8').split('\n');
  const out = lines.filter((line) => !line.trim().startsWith(`${key}=`));
  if (out.length === lines.length) return false;
  writeFileSync(file, out.join('\n').replace(/\n+$/, '\n'), 'utf8');
  return true;
}
