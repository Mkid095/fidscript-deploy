import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  AuthorizeUrlOptions,
  ExchangeCodeOptions,
  OAuthProfile,
  OAuthProvider,
} from './oauth-provider.interface';

const AUTH_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const EMAILS_URL = 'https://api.github.com/user/emails';

@Injectable()
export class GitHubOAuthProvider implements OAuthProvider {
  readonly name = 'github' as const;
  private readonly logger = new Logger(GitHubOAuthProvider.name);

  buildAuthorizeUrl(opts: AuthorizeUrlOptions): string {
    const params = new URLSearchParams({
      client_id: 'PLACEHOLDER_REPLACED_AT_RUNTIME',
      redirect_uri: opts.redirectUri,
      scope: opts.scopes.join(' '),
      state: opts.state,
      allow_signup: 'true',
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(opts: ExchangeCodeOptions): Promise<{ accessToken: string }> {
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        code: opts.code,
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        redirect_uri: opts.redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      },
    );
    if (!res.data?.access_token) {
      this.logger.error('GitHub token exchange missing access_token', res.data);
      throw new Error('GitHub token exchange failed');
    }
    return { accessToken: res.data.access_token };
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'fidscript-deploy-baaas',
    };

    const [userRes, emailsRes] = await Promise.all([
      axios.get(USER_URL, { headers }),
      axios.get(EMAILS_URL, { headers }),
    ]);
    const user = userRes.data;
    const emails = emailsRes.data;

    if (!user?.id) {
      throw new Error('GitHub /user missing id');
    }

    // Primary email: the one with primary=true, verified=true.
    let primary = emails?.find((e: any) => e.primary && e.verified);
    if (!primary) primary = emails?.find((e: any) => e.verified);
    if (!primary) primary = emails?.[0];
    const email = (primary?.email || user.email || '').toLowerCase();
    if (!email) {
      throw new Error('GitHub profile has no usable email');
    }

    return {
      providerUserId: String(user.id),
      email,
      emailVerified: primary?.verified === true,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
    };
  }
}