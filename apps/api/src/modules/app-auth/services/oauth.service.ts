import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { RedisService } from '@/modules/redis/redis.service';
import { AppAuthTokenService, IssuedTokens } from './app-auth-token.service';
import { OAuthProvider, OAuthProviderName } from '../oauth/oauth-provider.interface';
import { GoogleOAuthProvider } from '../oauth/google.provider';
import { GitHubOAuthProvider } from '../oauth/github.provider';
import { MockOAuthProvider } from '../oauth/mock.provider';
import * as crypto from 'crypto';

const STATE_TTL_SEC = 5 * 60;

interface StatePayload {
  projectId: string;
  provider: OAuthProviderName;
  appRedirectUrl?: string; // where the front-end wants the tokens delivered
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly providers = new Map<OAuthProviderName, OAuthProvider>();
  private readonly defaultScopes: Record<OAuthProviderName, string[]> = {
    google: ['openid', 'email', 'profile'],
    github: ['read:user', 'user:email'],
    mock: ['email', 'profile'],
  };
  private readonly platformBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
    private redis: RedisService,
    private tokenService: AppAuthTokenService,
    configService: ConfigService,
  ) {
    this.providers.set('google', new GoogleOAuthProvider());
    this.providers.set('github', new GitHubOAuthProvider());
    this.providers.set('mock', new MockOAuthProvider());
    this.platformBaseUrl =
      configService.get<string>('PLATFORM_PUBLIC_URL') ||
      configService.get<string>('PLATFORM_BASE_URL') ||
      'http://localhost:3001';
  }

  private getProvider(name: string): OAuthProvider {
    const p = this.providers.get(name as OAuthProviderName);
    if (!p) throw new BadRequestException(`Unknown OAuth provider: ${name}`);
    return p;
  }

  /** Step 1 of the flow: returns the provider's authorize URL. */
  async startAuthorization(
    projectId: string,
    providerName: string,
    appRedirectUrl?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ url: string }> {
    const provider = this.getProvider(providerName);

    let scopes: string[];
    // MOCK is a special case — no DB config required.
    if (providerName === 'mock') {
      scopes = this.defaultScopes['mock'];
    } else {
      const config = await this.prisma.authProvider.findUnique({
        where: { projectId_provider: { projectId, provider: providerName.toUpperCase() as any } },
      });
      if (!config || !config.enabled) {
        throw new NotFoundException(`OAuth provider ${providerName} is not configured or disabled`);
      }
      const configScopes = (config.scopes as string[] | null) || [];
      scopes = configScopes.length > 0 ? configScopes : this.defaultScopes[providerName as OAuthProviderName];
      // Inject real client_id from DB into the authorize URL.
      const clientId = this.cryptoService.decrypt(config.encryptedClientId);
      const callbackRedirect = `${this.platformBaseUrl}/api/v1/projects/${projectId}/auth/oauth/${providerName}/callback`;
      const state = crypto.randomBytes(32).toString('base64url');
      const payload: StatePayload = { projectId, provider: providerName as OAuthProviderName, appRedirectUrl };
      await this.redis.set(`oauth:state:${state}`, payload, STATE_TTL_SEC);
      let url = provider.buildAuthorizeUrl({ state, redirectUri: callbackRedirect, scopes });
      url = url.replace('PLACEHOLDER_REPLACED_AT_RUNTIME', encodeURIComponent(clientId));
      await this.eventService.emit('auth.oauth_authorize_started', projectId, {
        provider: providerName, state,
      }, { ipAddress, userAgent });
      return { url };
    }

    const state = crypto.randomBytes(32).toString('base64url');
    const payload: StatePayload = { projectId, provider: providerName as OAuthProviderName, appRedirectUrl };
    await this.redis.set(`oauth:state:${state}`, payload, STATE_TTL_SEC);

    // Build the redirect_uri the provider should call back to — our own callback endpoint.
    const callbackRedirect = `${this.platformBaseUrl}/api/v1/projects/${projectId}/auth/oauth/${providerName}/callback`;

    // MOCK provider builds its own URL with placeholder (no real client_id needed).
    let url = provider.buildAuthorizeUrl({ state, redirectUri: callbackRedirect, scopes });

    await this.eventService.emit('auth.oauth_authorize_started', projectId, {
      provider: providerName, state,
    }, { ipAddress, userAgent });

    return { url };
  }

  /** Step 2 of the flow: exchange the code, find/create AppUser, issue tokens. */
  async handleCallback(
    projectId: string,
    providerName: string,
    code: string,
    state: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ tokens: IssuedTokens; appUser: { id: string; email: string; name: string | null }; appRedirectUrl?: string }> {
    if (!code || !state) throw new BadRequestException('Missing code or state');

    // 1) Verify state
    const stateKey = `oauth:state:${state}`;
    const statePayload = await this.redis.get<StatePayload>(stateKey);
    if (!statePayload) throw new BadRequestException('Invalid or expired state');
    if (statePayload.projectId !== projectId || statePayload.provider !== providerName) {
      throw new BadRequestException('State mismatch');
    }
    // Consume state (one-shot).
    await this.redis.del(stateKey);

    // 2) Exchange code → access_token
    const provider = this.getProvider(providerName);
    let accessToken: string;
    try {
      if (providerName === 'mock') {
        // MOCK uses placeholder creds — exchange directly without DB lookup.
        const exchanged = await provider.exchangeCode({
          code,
          redirectUri: `${this.platformBaseUrl}/callback`,
          clientId: 'mock-client-id',
          clientSecret: 'mock-client-secret',
        });
        accessToken = exchanged.accessToken;
      } else {
        const config = await this.prisma.authProvider.findUnique({
          where: { projectId_provider: { projectId, provider: providerName.toUpperCase() as any } },
        });
        if (!config || !config.enabled) {
          throw new NotFoundException(`OAuth provider ${providerName} is not configured or disabled`);
        }
        const clientId = this.cryptoService.decrypt(config.encryptedClientId);
        const clientSecret = this.cryptoService.decrypt(config.encryptedClientSecret);
        const callbackRedirect = `${this.platformBaseUrl}/api/v1/projects/${projectId}/auth/oauth/${providerName}/callback`;
        const exchanged = await provider.exchangeCode({ code, redirectUri: callbackRedirect, clientId, clientSecret });
        accessToken = exchanged.accessToken;
      }
    } catch (err) {
      this.logger.error(`OAuth code exchange failed: ${(err as Error).message}`);
      await this.eventService.emit('auth.oauth_signin_failed', projectId, {
        provider: providerName, reason: 'exchange_failed',
      }, { ipAddress, userAgent });
      throw new BadRequestException('OAuth code exchange failed');
    }

    // 4) Fetch profile
    let profile;
    try {
      profile = await provider.fetchProfile(accessToken);
    } catch (err) {
      this.logger.error(`OAuth profile fetch failed: ${(err as Error).message}`);
      await this.eventService.emit('auth.oauth_signin_failed', projectId, {
        provider: providerName, reason: 'profile_fetch_failed',
      }, { ipAddress, userAgent });
      throw new BadRequestException('OAuth profile fetch failed');
    }

    // 5) Find-or-create AppUser
    const isMock = providerName === 'mock';
    let appUser;
    let isNewUser = false;

    if (!isMock) {
      // For real providers: link by OAuth provider_user_id.
      const existingLink = await this.prisma.appOAuthAccount.findUnique({
        where: { provider_providerUserId: { provider: providerName.toUpperCase() as any, providerUserId: profile.providerUserId } },
      });
      if (existingLink) {
        appUser = await this.prisma.appUser.findUnique({ where: { id: existingLink.appUserId } });
        if (!appUser || appUser.projectId !== projectId) {
          throw new BadRequestException('OAuth identity linked to a different project');
        }
        await this.prisma.appOAuthAccount.update({
          where: { id: existingLink.id },
          data: { providerEmail: profile.email },
        });
      } else {
        // Try to link by project+email first.
        appUser = await this.prisma.appUser.findUnique({
          where: { projectId_email: { projectId, email: profile.email } },
        });
        if (!appUser) {
          appUser = await this.prisma.appUser.create({
            data: {
              projectId,
              email: profile.email,
              name: profile.name ?? null,
              emailVerified: profile.emailVerified,
            },
          });
          isNewUser = true;
        }
        await this.prisma.appOAuthAccount.create({
          data: {
            appUserId: appUser.id,
            projectId,
            provider: providerName.toUpperCase() as any,
            providerUserId: profile.providerUserId,
            providerEmail: profile.email,
          },
        });
        await this.eventService.emit('auth.oauth_linked', projectId, {
          userId: appUser.id,
          provider: providerName,
        }, { actorId: appUser.id, ipAddress, userAgent });
      }
    } else {
      // For mock: find-or-create by email only (no OAuth account linkage).
      appUser = await this.prisma.appUser.findUnique({
        where: { projectId_email: { projectId, email: profile.email } },
      });
      if (!appUser) {
        appUser = await this.prisma.appUser.create({
          data: {
            projectId,
            email: profile.email,
            name: profile.name ?? null,
            emailVerified: profile.emailVerified,
          },
        });
        isNewUser = true;
      }
    }

    // 6) Issue tokens (uses the JWT-based AppAuthTokenService).
    const tokens = await this.tokenService.issueTokens(
      appUser.id,
      projectId,
      appUser.email,
      ipAddress,
      userAgent,
    );

    await this.eventService.emit('auth.oauth_signin_succeeded', projectId, {
      userId: appUser.id,
      provider: providerName,
      email: appUser.email,
    }, { actorId: appUser.id, ipAddress, userAgent });

    return {
      tokens,
      appUser: { id: appUser.id, email: appUser.email, name: appUser.name },
      appRedirectUrl: statePayload.appRedirectUrl,
    };
  }
}