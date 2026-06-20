/**
 * Per-provider OAuth contract for the multi-tenant BaaS auth service.
 *
 * Passport strategies don't fit per-project dynamic credentials (singletons
 * with fixed creds); we implement the OAuth2 Authorization Code flow manually
 * with axios. This is the multi-tenant-correct pattern (PKCE-capable).
 *
 * Each provider must:
 *   - buildAuthorizeUrl({state, redirectUri, scopes}) → URL to redirect the user to
 *   - exchangeCode({code, redirectUri, clientId, clientSecret}) → { accessToken }
 *   - fetchProfile(accessToken) → { providerUserId, email, emailVerified, name, avatarUrl? }
 */
export type OAuthProviderName = 'google' | 'github' | 'mock';

export interface AuthorizeUrlOptions {
  state: string;
  redirectUri: string;
  scopes: string[];
}

export interface ExchangeCodeOptions {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

export interface OAuthProfile {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

export interface OAuthProvider {
  readonly name: OAuthProviderName;
  buildAuthorizeUrl(opts: AuthorizeUrlOptions): string;
  exchangeCode(opts: ExchangeCodeOptions): Promise<{ accessToken: string }>;
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}