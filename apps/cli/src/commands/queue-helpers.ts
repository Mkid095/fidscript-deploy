/**
 * CLI queues — shared helpers (loadSdk, printTable, confirmDelete, types).
 * Imported by apps/cli/src/commands/queues.ts.
 */
import { createInterface } from 'readline';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

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
  const { createFidscript } = await import('@fidscript-deploy/sdk');
  return createFidscript({ apiKey, baseURL: ctx.apiUrl });
}

export async function printTable(rows: Record<string, unknown>[], fmt: string): Promise<void> {
  const { print } = await import('../utils/output');
  print(rows, fmt as 'table' | 'json' | 'raw');
}

export async function confirmDelete(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>(resolve => rl.question(prompt, resolve));
  rl.close();
  return answer.toLowerCase() === 'y';
}

export interface QueueRow {
  id: string;
  name: string;
  type: string;
  status: string;
  retentionDays: number;
  maxMessages: number;
  createdAt: string;
}

export interface QueueStats {
  jsDepth: number;
  pending: number;
  delivered: number;
  acknowledged: number;
  failed: number;
  deadLettered: number;
  total: number;
}
