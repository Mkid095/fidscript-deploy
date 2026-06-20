import { Injectable } from '@nestjs/common';
import { URLSearchParams } from 'url';
import {
  AuthorizeUrlOptions,
  ExchangeCodeOptions,
  OAuthProfile,
  OAuthProvider,
} from './oauth-provider.interface';

/**
 * A mock OAuth provider that lets us prove the full sign-in flow without
 * real Google/GitHub credentials. It echoes the state token and "code" back
 * through the authorize URL so the test can drive the callback deterministically.
 *
 * The mock provider is intentionally only available in the same process — it
 * should be excluded in production (gate on env flag if it ever needs to ship).
 */
@Injectable()
export class MockOAuthProvider implements OAuthProvider {
  readonly name = 'mock' as const;

  buildAuthorizeUrl(opts: AuthorizeUrlOptions): string {
    // Echo everything back via a sentinel so tests can find the callback URL.
    const params = new URLSearchParams({
      code: `mock-code-${opts.state}`,
      state: opts.state,
      redirect: opts.redirectUri,
    });
    return `https://mock.oauth.local/authorize?${params.toString()}`;
  }

  async exchangeCode(_opts: ExchangeCodeOptions): Promise<{ accessToken: string }> {
    // Return a deterministic access token derived from the code.
    return { accessToken: `mock-access-${_opts.code}` };
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    // Derive a deterministic profile from the access token. Format:
    //   mock-access-<state>  →  email: mock-<state>@example.test
    const state = accessToken.replace(/^mock-access-/, '');
    return {
      providerUserId: `mock-${state}`,
      email: `mock-${state}@example.test`,
      emailVerified: true,
      name: `Mock User ${state.slice(0, 8)}`,
      avatarUrl: undefined,
    };
  }
}