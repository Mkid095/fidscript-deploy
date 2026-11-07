/**
 * CLI cron — shared helpers (CliContext, die, loadSdk, printTable, confirm).
 * Imported by apps/cli/src/commands/cron.ts.
 */
import { createInterface } from 'readline';

export interface CliContext {
  apiUrl: string | undefined;
  getApiKey(): string | undefined;
  loadConfig(): { apiUrl?: string; outputFormat?: string; currentProject?: string };
}

export function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

export async function loadSdk(ctx: CliContext) {
  if (!ctx.apiUrl) die('No API URL configured — set FIDScript_API_URL env var or run: fidscript configure');
  const apiKey = ctx.getApiKey() ?? die('Not logged in');
  const { createFidscript } = await import('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}

export async function printTable(rows: Record<string, unknown>[], fmt: string): Promise<void> {
  const { print } = await import('../utils/output');
  print(rows, fmt as 'table' | 'json' | 'raw');
}

export async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(prompt, resolve));
  rl.close();
  return answer.toLowerCase() === 'y';
}