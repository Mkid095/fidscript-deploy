import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';

import { GithubOAuthAppService } from './github-oauth-app.service';
import { GithubOAuthStateService, type GithubStatePayload } from './github-oauth-state.service';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
// admin:repo_hook lets us register push-to-deploy webhooks on connected repos.
const GITHUB_SCOPES = 'read:user,user:email,repo,admin:repo_hook';

/**
 * The start of the GitHub OAuth sign-in: the URL the browser opens.
 *
 * It needs a GitHub OAuth app, which a deployment may not have. When it does
 * not, `isConfigured` says so and the personal access token is the way in
 * instead.
 */
@Injectable()
export class GithubOAuthService {
  private readonly logger = new Logger(GithubOAuthService.name);

  constructor(
    private readonly app: GithubOAuthAppService,
    private readonly state: GithubOAuthStateService,
  ) {}

  /** Whether a GitHub OAuth app is configured for this deployment. */
  isConfigured(): boolean {
    return this.app.isConfigured();
  }

  /** The URL the browser opens to start the sign-in. */
  async buildAuthorizeUrl(userId: string, redirectAfterUrl?: string): Promise<{ url: string }> {
    if (!this.app.isConfigured()) {
      throw new ServiceUnavailableException(
        'GitHub sign-in is not configured on this deployment — connect with a personal access token instead.',
      );
    }

    const state = crypto.randomBytes(32).toString('base64url');
    const payload: GithubStatePayload = { userId, redirectAfterUrl };

    // The callback comes back from GitHub without our JWT, so the state is
    // how it knows whose sign-in it is finishing.
    await this.state.remember(state, payload);

    const params = new URLSearchParams({
      client_id: this.app.clientId,
      redirect_uri: this.app.callbackUrl(),
      scope: GITHUB_SCOPES,
      state,
      allow_signup: 'true',
    });

    this.logger.log(`GitHub OAuth authorize for user=${userId}`);
    return { url: `${GITHUB_AUTH_URL}?${params.toString()}` };
  }
}
