import 'server-only';

import { serverApi as api } from './server';

/**
 * The accounts the platform holds for a person.
 *
 * A GitHub token and a Cloudflare token are **credentials**: they are kept
 * encrypted by the platform, they are never shown again, and they are used
 * only for the projects they were connected for.
 */

export interface GithubConnection {
  connected: boolean;
  username?: string;
  avatarUrl?: string | null;
  scopes?: string[];
}

export interface GithubRepo {
  full_name: string;
  name: string;
  private: boolean;
  description?: string | null;
  default_branch: string;
  html_url?: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

/** The GitHub account this person has connected, if any. */
export async function getGithubConnection(): Promise<GithubConnection> {
  return api
    .get<GithubConnection>('/users/me/github/status')
    .catch(() => ({ connected: false }));
}

/** The repositories the connected account can reach. */
export async function getGithubRepos(): Promise<GithubRepo[]> {
  const response = await api
    .get<{ repos?: GithubRepo[] }>('/users/me/github/repos')
    .catch(() => ({ repos: [] }));
  return response.repos ?? [];
}

/** The zones in the connected Cloudflare account. */
export async function getCloudflareZones(
  projectId: string,
): Promise<CloudflareZone[]> {
  const response = await api
    .get<{
      zones?: CloudflareZone[];
    }>(`/projects/${projectId}/domains/connect-cloudflare/zones`)
    .catch(() => ({ zones: [] }));
  return response.zones ?? [];
}
