import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EventService } from '@/modules/events/event.service';
import { GithubApiService, type GithubRepo } from './github-api.service';
import { GithubConnectionStore } from './github-connection.store';
import { GithubOAuthService } from './github-oauth.service';
import { GithubOAuthExchangeService } from './github-oauth-exchange.service';

/**
 * The GitHub account a platform user is connected to.
 *
 * Two ways in: the OAuth popup (when the deployment has a GitHub OAuth app)
 * and a personal access token (when it does not, and when a person wants to
 * use one anyway). Both end in the same encrypted row.
 */
@Injectable()
export class UserGithubService {
  private readonly logger = new Logger(UserGithubService.name);

  constructor(
    private readonly connections: GithubConnectionStore,
    private readonly githubApi: GithubApiService,
    private readonly oauth: GithubOAuthService,
    private readonly exchange: GithubOAuthExchangeService,
    private readonly eventService: EventService,
  ) {}

  /** Whether this deployment has a GitHub OAuth app. */
  isOAuthConfigured(): boolean {
    return this.oauth.isConfigured();
  }

  /** The URL the browser opens to start the OAuth sign-in. */
  buildAuthorizeUrl(userId: string, redirectAfterUrl?: string): Promise<{ url: string }> {
    return this.oauth.buildAuthorizeUrl(userId, redirectAfterUrl);
  }

  /** Exchanges the OAuth code for a stored connection. */
  handleCallback(code: string, state: string): Promise<{
    username: string;
    avatarUrl?: string;
    scopes: string;
  }> {
    return this.exchange.handle(code, state);
  }

  /**
   * Connects a GitHub account with a personal access token.
   *
   * The token is checked against GitHub before it is stored, and stored
   * encrypted — exactly like the token the OAuth flow gets. It never leaves
   * the server in a response, and it is never written to a log.
   */
  async connectWithToken(userId: string, token: string): Promise<{
    username: string;
    avatarUrl?: string;
    scopes: string;
  }> {
    const trimmed = token?.trim();
    if (!trimmed) throw new BadRequestException('Missing token');
    if (!/^(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(trimmed)) {
      throw new BadRequestException(
        'That does not look like a GitHub personal access token — it should start with ghp_, gho_, ghs_ or github_pat_.',
      );
    }

    const identity = await this.githubApi.identify(trimmed);
    const scopes = identity.scopes || 'repo,read:user';

    await this.connections.save(userId, {
      githubUserId: identity.githubUserId,
      username: identity.username,
      avatarUrl: identity.avatarUrl ?? null,
      accessToken: trimmed,
      scopes,
    });

    this.eventService.emit('users.github_connected', null, {
      userId,
      githubUserId: identity.githubUserId,
      username: identity.username,
    });

    this.logger.log(`GitHub connected by token for user=${userId} as ${identity.username}`);
    return { username: identity.username, avatarUrl: identity.avatarUrl, scopes };
  }

  /** The connection, or null when the account is not connected. */
  async getConnection(userId: string) {
    const conn = await this.connections.find(userId);
    if (!conn) return null;
    return {
      githubUserId: conn.githubUserId,
      username: conn.username,
      avatarUrl: conn.avatarUrl,
      scopes: conn.scopes,
      tokenExpiresAt: conn.tokenExpiresAt,
      connected: true,
    };
  }

  /** The git-clone credentials, or null when there is no connection. */
  getCloneCredentials(userId: string): Promise<string | null> {
    return this.connections.cloneCredentials(userId);
  }

  /** Removes the connection. */
  async disconnect(userId: string): Promise<void> {
    await this.connections.remove(userId);
    this.eventService.emit('users.github_disconnected', null, { userId });
    this.logger.log(`GitHub disconnected for user=${userId}`);
  }

  /** The repositories the connected account can reach. */
  async listRepos(
    userId: string,
    page = 1,
    limit = 30,
  ): Promise<{ repos: GithubRepo[]; total: number; hasMore: boolean }> {
    const token = await this.requireToken(userId);
    return this.githubApi.listRepos(token, page, limit);
  }

  /** The branches of a repository. */
  async listBranches(
    userId: string,
    repoFullName: string,
  ): Promise<Array<{ name: string; commit: { sha: string } }>> {
    const token = await this.requireToken(userId);
    return this.githubApi.listBranches(token, repoFullName);
  }

  /** The stored token, decrypted — or the reason there isn't one. */
  private async requireToken(userId: string): Promise<string> {
    const token = await this.connections.token(userId);
    if (!token) throw new NotFoundException('GitHub account not connected');
    return token;
  }
}
