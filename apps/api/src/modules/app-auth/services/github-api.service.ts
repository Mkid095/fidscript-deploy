import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_REPOS_URL = 'https://api.github.com/user/repos';

export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description?: string;
}

export interface GithubIdentity {
  githubUserId: string;
  username: string;
  avatarUrl?: string;
  scopes: string;
}

/**
 * The calls to GitHub itself.
 *
 * Nothing here stores anything or knows about platform users — it speaks
 * GitHub and hands back what GitHub said.
 */
@Injectable()
export class GithubApiService {
  private readonly logger = new Logger(GithubApiService.name);

  /**
   * Checks a token and says who it belongs to.
   *
   * A token GitHub does not recognise is a 401, and that is the caller's
   * problem to hear about — so it is a bad request, not a server error.
   */
  async identify(token: string): Promise<GithubIdentity> {
    try {
      const res = await axios.get<{ id: number; login: string; avatar_url?: string }>(
        GITHUB_USER_URL,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'fidscript-deploy',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      return {
        githubUserId: String(res.data.id),
        username: res.data.login,
        avatarUrl: res.data.avatar_url,
        scopes: String(res.headers['x-oauth-scopes'] ?? ''),
      };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        throw new BadRequestException('GitHub rejected that token — check it and try again.');
      }
      this.logger.error(`GitHub token validation failed: ${(err as Error).message}`);
      throw new BadRequestException('Could not reach GitHub to check that token.');
    }
  }

  /** The repositories the account can reach. */
  async listRepos(
    token: string,
    page = 1,
    limit = 30,
  ): Promise<{ repos: GithubRepo[]; total: number; hasMore: boolean }> {
    try {
      const res = await axios.get<GithubRepo[]>(GITHUB_REPOS_URL, {
        headers: this.headers(token),
        params: { sort: 'updated', per_page: limit, page, affiliation: 'owner' },
      });
      const repos = res.data;
      const total = parseInt(res.headers['x-total-count'] as string, 10) || repos.length;
      return { repos, total, hasMore: page * limit < total };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        throw new BadRequestException(
          'GitHub token expired — please reconnect your GitHub account',
        );
      }
      this.logger.error(`GitHub repos fetch failed: ${(err as Error).message}`);
      throw new BadRequestException('Failed to fetch GitHub repositories');
    }
  }

  /** The branches of a repository. */
  async listBranches(
    token: string,
    repoFullName: string,
  ): Promise<Array<{ name: string; commit: { sha: string } }>> {
    try {
      const res = await axios.get(`https://api.github.com/repos/${repoFullName}/branches`, {
        headers: this.headers(token),
        params: { per_page: 100 },
      });
      return res.data;
    } catch (err) {
      this.logger.error(`GitHub branches failed for ${repoFullName}: ${(err as Error).message}`);
      throw new BadRequestException('Failed to fetch repository branches');
    }
  }

  private headers(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'fidscript-deploy',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
}
