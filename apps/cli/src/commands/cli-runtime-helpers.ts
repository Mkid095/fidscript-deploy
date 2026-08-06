/**
 * CLI runtime helpers — shared by top-level commands (init, logs, whoami).
 * `die`, `loadSdk`, and the `CliContext` shape used by every top-level command.
 * Imported by apps/cli/src/bin/fidscript.ts and individual command modules.
 */

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