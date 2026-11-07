/**
 * CLI functions — shared helpers (loadSdk, die, types).
 * Imported by apps/cli/src/commands/functions.ts.
 */
import { createRequire } from 'module';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
const require = createRequire(import.meta.url);

export interface CliContext {
  apiUrl: string | undefined;
  getApiKey(): string | undefined;
  loadConfig(): { apiUrl?: string; outputFormat?: string; currentProject?: string };
}

export function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

export async function loadSdk(ctx: CliContext): Promise<FidscriptSDK> {
  if (!ctx.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
  const apiKey = ctx.getApiKey() ?? die('Not logged in');
  const { createFidscript } = require('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}
