/**
 * The shared vocabulary of the deployment wizards.
 *
 * Two wizards exist — the one inside a project and the one that starts from
 * the platform itself — and they have to agree about what a source is, what
 * a repository is called, and how a .env file is read. This is that
 * agreement, in one place.
 */

/** Where the code comes from. */
export type SourceType = 'git' | 'archive';

/** The largest archive the platform will take. */
export const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024;

/** The owner and the repository of a git URL. */
export function extractRepoInfo(url: string): { repo: string; owner: string } {
  const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: `${sshMatch[1]}/${sshMatch[2]}` };
  if (httpsMatch) return { owner: httpsMatch[1], repo: `${httpsMatch[1]}/${httpsMatch[2]}` };
  return { owner: '', repo: url };
}

/** The access token the dashboard holds for the API. */
export function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '';
}

/**
 * Read a .env-style block into a map.
 *
 * Blank lines and `#` comments are ignored, quotes around a value are
 * dropped, and a line without an `=` is not a variable.
 */
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
