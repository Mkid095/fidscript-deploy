/**
 * Registry credentials — where the token comes from, and where it is kept.
 *
 * The token is a secret: it can publish and unpublish packages. It is never
 * written into the repository and never printed back to the operator unless
 * they ask for it explicitly.
 *
 * It is read, in order, from:
 *   1. `FIDScript_REGISTRY_TOKEN` — the environment (what CI uses)
 *   2. `NPM_TOKEN` — the environment (what npm itself reads)
 *   3. `~/.fidscript/registry.json` — written by `fidscript registry login`
 *   4. `~/.npmrc` — the token npm already has, if it is for this registry
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const DEFAULT_REGISTRY_URL = 'https://registry.fidscript.com';
export const REGISTRY_CREDENTIALS_FILE = join(homedir(), '.fidscript', 'registry.json');
const NPMRC_FILE = join(homedir(), '.npmrc');

export interface RegistryCredential {
  token?: string;
  username?: string;
  registryUrl?: string;
}

/** The registry this CLI talks to. */
export function registryUrl(): string {
  const url = process.env.FIDScript_REGISTRY_URL ?? DEFAULT_REGISTRY_URL;
  return url.replace(/\/+$/, '');
}

/** The saved credential, if there is one. */
export function loadRegistryCredential(): RegistryCredential {
  if (!existsSync(REGISTRY_CREDENTIALS_FILE)) return {};
  try {
    const raw = readFileSync(REGISTRY_CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as RegistryCredential;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRegistryCredential(credential: RegistryCredential): void {
  mkdirSync(join(homedir(), '.fidscript'), { recursive: true, mode: 0o700 });
  writeFileSync(REGISTRY_CREDENTIALS_FILE, JSON.stringify(credential, null, 2), 'utf8');
  chmodSync(REGISTRY_CREDENTIALS_FILE, 0o600);
}

export function clearRegistryCredential(): void {
  if (!existsSync(REGISTRY_CREDENTIALS_FILE)) return;
  writeFileSync(REGISTRY_CREDENTIALS_FILE, JSON.stringify({}), 'utf8');
  chmodSync(REGISTRY_CREDENTIALS_FILE, 0o600);
}

/**
 * The token npm already holds for this registry, read from ~/.npmrc.
 *
 * The key is `//<host>/:_authToken`, so the host has to match — a token for
 * one registry is not a token for another.
 */
export function readNpmrcToken(url = registryUrl()): string | undefined {
  if (!existsSync(NPMRC_FILE)) return undefined;
  const host = hostOf(url);
  let fallback: string | undefined;
  for (const line of readFileSync(NPMRC_FILE, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('//') || !trimmed.includes(':_authToken=')) continue;
    const key = trimmed.slice(0, trimmed.indexOf('='));
    const value = trimmed.slice(trimmed.indexOf('=') + 1).trim();
    if (!value) continue;
    if (key.includes(host)) return value;
    fallback ??= value;
  }
  return fallback;
}

/** The token for the registry, from wherever the operator put it. */
export function readRegistryToken(): string | undefined {
  const fromEnv = process.env.FIDScript_REGISTRY_TOKEN ?? process.env.NPM_TOKEN;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const stored = loadRegistryCredential().token;
  if (stored && stored.trim()) return stored.trim();
  return readNpmrcToken();
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}
