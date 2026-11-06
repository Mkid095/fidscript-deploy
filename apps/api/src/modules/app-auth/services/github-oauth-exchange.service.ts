import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { EventService } from '@/modules/events/event.service';
import { GithubApiService } from './github-api.service';
import { GithubConnectionStore } from './github-connection.store';
import { GithubOAuthAppService } from './github-oauth-app.service';
import { GithubOAuthStateService } from './github-oauth-state.service';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_SCOPES = 'read:user,user:email,repo,admin:repo_hook';

interface GithubTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * The end of the OAuth sign-in: the code GitHub sent back becomes a stored
 * connection — the same encrypted row a personal access token produces.
 */
@Injectable()
export class GithubOAuthExchangeService {
  private readonly logger = new Logger(GithubOAuthExchangeService.name);

  constructor(
    private readonly app: GithubOAuthAppService,
    private readonly connections: GithubConnectionStore,
    private readonly githubApi: GithubApiService,
    private readonly eventService: EventService,
    private readonly state: GithubOAuthStateService,
  ) {}

  /** Exchanges the code for a stored connection. */
  async handle(code: string, state: string): Promise<{
    username: string;
    avatarUrl?: string;
    scopes: string;
  }> {
    if (!code || !state) throw new BadRequestException('Missing OAuth code or state');
    const payload = await this.state.take(state);
    if (!payload) throw new BadRequestException('Invalid or expired OAuth state');

    const tokenData = await this.exchangeCode(code);
    const identity = await this.githubApi.identify(tokenData.access_token);
    const scopes = tokenData.scope || GITHUB_SCOPES;

    await this.connections.save(payload.userId, {
      githubUserId: identity.githubUserId,
      username: identity.username,
      avatarUrl: identity.avatarUrl ?? null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      tokenExpiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
      scopes,
    });

    this.eventService.emit('users.github_connected', null, {
      userId: payload.userId,
      githubUserId: identity.githubUserId,
      username: identity.username,
    });

    this.logger.log(`GitHub connected for user=${payload.userId} as ${identity.username}`);
    return { username: identity.username, avatarUrl: identity.avatarUrl, scopes };
  }

  /** The code → token call. */
  private async exchangeCode(code: string): Promise<GithubTokenResponse> {
    try {
      const res = await axios.post<GithubTokenResponse>(
        GITHUB_TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: this.app.clientId,
          client_secret: this.app.clientSecret,
          redirect_uri: this.app.callbackUrl(),
        }),
        { headers: { Accept: 'application/json' } },
      );
      if (!res.data?.access_token) {
        throw new BadRequestException('GitHub OAuth failed — no access token returned');
      }
      return res.data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`GitHub token exchange failed: ${(err as Error).message}`);
      throw new BadRequestException('GitHub OAuth failed — could not exchange code');
    }
  }
}
