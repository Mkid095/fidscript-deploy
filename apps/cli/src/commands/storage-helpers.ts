/**
 * CLI storage — shared helpers (loadSdk, printTable, BucketRow, findBucketId).
 * Imported by apps/cli/src/commands/storage.ts.
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

export interface BucketRow {
  id: string;
  name: string;
  provider: string;
  region: string | null;
  isPublic: boolean;
}

export async function findBucketId(
  sdk: FidscriptSDK,
  projectId: string,
  name: string,
): Promise<string> {
  const buckets = (await sdk.storage.listBuckets(projectId)) as unknown as BucketRow[];
  const found = buckets.find(b => b.id === name || b.name === name);
  if (!found) die(`Bucket not found in project ${projectId}: ${name}`);
  return found.id;
}

export async function confirmDelete(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>(resolve => rl.question(prompt, resolve));
  rl.close();
  return answer.toLowerCase() === 'y';
}
