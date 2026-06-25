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

  /** Redirect to GitHub OAuth authorize URL */
  async connect(redirectAfterUrl?: string): Promise<{ url: string }> {
    const params: Record<string, string> = {};
    if (redirectAfterUrl) params.redirect = redirectAfterUrl;
    return this.client.get('/api/v1/users/me/github/connect', params);
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
