import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  AuthorizeUrlOptions,
  ExchangeCodeOptions,
  OAuthProfile,
  OAuthProvider,
} from './oauth-provider.interface';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  readonly name = 'google' as const;
  private readonly logger = new Logger(GoogleOAuthProvider.name);

  buildAuthorizeUrl(opts: AuthorizeUrlOptions): string {
    const params = new URLSearchParams({
      client_id: 'PLACEHOLDER_REPLACED_AT_RUNTIME',
      redirect_uri: opts.redirectUri,
      response_type: 'code',
      scope: opts.scopes.join(' '),
      state: opts.state,
      access_type: 'online',
      prompt: 'select_account',
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
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    if (!res.data?.access_token) {
      this.logger.error('Google token exchange missing access_token', res.data);
      throw new Error('Google token exchange failed');
    }
    return { accessToken: res.data.access_token };
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const res = await axios.get(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const p = res.data;
    if (!p?.sub || !p?.email) {
      throw new Error('Google userinfo missing sub/email');
    }
    return {
      providerUserId: p.sub,
      email: p.email.toLowerCase(),
      emailVerified: p.email_verified === true || p.email_verified === 'true',
      name: p.name,
      avatarUrl: p.picture,
    };
  }
}