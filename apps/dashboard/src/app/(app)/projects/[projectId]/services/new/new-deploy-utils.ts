// Shared utilities and types for the new deployment wizard

import type { GithubRepo, GithubBranch, GithubStatus } from './new-deploy-types';

export { type GithubRepo, GithubBranch, GithubStatus } from './new-deploy-types';

export type SourceType = 'git' | 'archive';

export const STEPS = [
  { label: 'Source' },
  { label: 'Repository' },
  { label: 'Configuration' },
  { label: 'Review' },
] as const;

export const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024; // 500 MB

export function extractRepoInfo(url: string): { repo: string; owner: string } {
  const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: `${sshMatch[1]}/${sshMatch[2]}` };
  if (httpsMatch) return { owner: httpsMatch[1], repo: `${httpsMatch[1]}/${httpsMatch[2]}` };
  return { owner: '', repo: url };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

export function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '';
}

// Parse a .env-style textarea into a Record<string, string>.
export function parseEnvText(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    let key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}
