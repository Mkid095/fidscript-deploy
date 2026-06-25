import { FidscriptClient } from '../client';

export interface GithubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  scopes?: string;
}

export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description?: string;
}

export interface GithubReposResult {
  repos: GithubRepo[];
  total: number;
  hasMore: boolean;
}

export class GithubModule {
  constructor(private client: FidscriptClient) {}

  /**
   * Opens GitHub OAuth in a popup window. The popup redirects to GitHub,
   * then back to our callback, which signals the opener via postMessage
   * and closes itself. The code is exchanged server-side automatically.
   *
   * Browser-only — will reject if called from a non-browser environment.
   */
  async connect(): Promise<{ connected: boolean; username?: string; avatarUrl?: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = globalThis as any;
    if (!win.open || !win.addEventListener || !win.removeEventListener) {
      throw new Error('GitHub OAuth connect is only available in browser environments');
    }

    return new Promise((resolve, reject) => {
      // First fetch the GitHub OAuth URL from our API (authenticated).
      this.client.get<{ url: string }>('/api/v1/users/me/github/connect').then(({ url }) => {
        if (!url) {
          reject(new Error('No OAuth URL returned from server'));
          return;
        }

        const popup = win.open(url, 'github-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
        if (!popup) {
          reject(new Error('Popup was blocked. Allow popups for this site and try again.'));
          return;
        }

        const handleMessage = (event: any) => {
          if (!event.data?.type?.startsWith('github-oauth')) return;
          win.removeEventListener('message', handleMessage);

          if (event.data.error) {
            popup.close();
            reject(new Error(`GitHub authorization failed: ${event.data.error}`));
            return;
          }

          if (!event.data.code) {
            popup.close();
            reject(new Error('No authorization code received from GitHub.'));
            return;
          }

          // Exchange the code for a connection server-side.
          this.client.post<{ username: string; avatarUrl?: string; scopes: string }>(
            '/api/v1/users/me/github/exchange',
            { code: event.data.code, state: event.data.state ?? '' },
          ).then(result => {
            resolve({ connected: true, username: result.username, avatarUrl: result.avatarUrl });
          }).catch(e => reject(e instanceof Error ? e : new Error(String(e))));
        };

        win.addEventListener('message', handleMessage);

        setTimeout(() => {
          win.removeEventListener('message', handleMessage);
          if (!popup.closed) popup.close();
          reject(new Error('GitHub authorization timed out.'));
        }, 120_000);
      }).catch(e => reject(e instanceof Error ? e : new Error(String(e))));
    });
  }

  /** Check if the platform user has a connected GitHub account */
  async status(): Promise<GithubConnectionStatus> {
    return this.client.get<GithubConnectionStatus>('/api/v1/users/me/github/status');
  }

  /** Remove the GitHub connection */
  async disconnect(): Promise<{ success: boolean }> {
    return this.client.delete('/api/v1/users/me/github/disconnect');
  }

  /** List the user's GitHub repositories */
  async listRepos(page = 1, limit = 30): Promise<GithubReposResult> {
    return this.client.get<GithubReposResult>('/api/v1/users/me/github/repos', { page: String(page), limit: String(limit) });
  }

  /** List branches for a repository */
  async listBranches(owner: string, repo: string): Promise<{ name: string; commit: { sha: string } }[]> {
    return this.client.get(`/api/v1/users/me/github/repos/${owner}/${repo}/branches`);
  }
}
