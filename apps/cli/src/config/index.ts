/**
 * Phase 18 — FIDScript CLI config and credential management.
 * Stores API key + current project in ~/.fidscript/
 */
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';
import { loadLocalProjectId } from './project-context-loader';

export const CONFIG_DIR = join(homedir(), '.fidscript');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

export interface CliConfig {
  apiUrl: string;
  currentProject?: string;
  outputFormat: 'table' | 'json' | 'raw';
}

export interface CliCredentials {
  apiKey?: string;
}

export function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { mode: 0o700 });
  }
}

export function loadConfig(): CliConfig {
  ensureDir();
  // FIDScript_API_URL env var takes priority — open-source consumers set their own host.
  // No hardcoded default: if neither env nor config file is present, the CLI will
  // prompt the user to configure their API URL on first run.
  if (!existsSync(CONFIG_FILE)) {
    return {
      apiUrl: process.env.FIDScript_API_URL ?? '',
      currentProject: loadLocalProjectId(),
      outputFormat: 'table',
    };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(raw) as CliConfig;
    return {
      ...config,
      apiUrl: process.env.FIDScript_API_URL ?? config.apiUrl,
      currentProject: loadLocalProjectId() ?? config.currentProject,
    };
  } catch {
    return {
      apiUrl: process.env.FIDScript_API_URL ?? '',
      currentProject: loadLocalProjectId(),
      outputFormat: 'table',
    };
  }
}

export function saveConfig(cfg: CliConfig): void {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  chmodSync(CONFIG_FILE, 0o600);
}

export function loadCredentials(): CliCredentials {
  ensureDir();
  if (!existsSync(CREDENTIALS_FILE)) return {};
  try {
    const raw = readFileSync(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(raw) as CliCredentials;
  } catch {
    return {};
  }
}

export function saveCredentials(creds: CliCredentials): void {
  ensureDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf8');
  chmodSync(CREDENTIALS_FILE, 0o600);
}

export function getApiKey(): string | undefined {
  return loadCredentials().apiKey;
}

export function setApiKey(key: string): void {
  saveCredentials({ apiKey: key });
}

export function clearCredentials(): void {
  saveCredentials({});
}
