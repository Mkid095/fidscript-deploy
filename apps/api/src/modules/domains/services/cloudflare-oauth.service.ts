import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainAccessService } from './domain-access.service';
import * as crypto from 'crypto';
import axios from 'axios';

const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY';
const SCOPES = ['zone:read', 'dns:edit', 'account:read'].join(' ');

@Injectable()
export class CloudflareOAuthService {
  private readonly logger = new Logger(CloudflareOAuthService.name);
  private readonly baseUrl = 'https://dash.cloudflare.com';

  // Env-var fallback (for dev/self-hosted without DB settings)
  private readonly envClientId: string;
  private readonly envClientSecret: string;
  private readonly envRedirectUri: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private access: DomainAccessService,
  ) {
    this.envClientId = this.configService.get<string>('CLOUDFLARE_CLIENT_ID', '');
    this.envClientSecret = this.configService.get<string>('CLOUDFLARE_CLIENT_SECRET', '');
    this.envRedirectUri = this.configService.get<string>('CLOUDFLARE_OAUTH_REDIRECT_URI', 'http://localhost:3000/api/callback/cloudflare');

    if (!this.envClientId || !this.envClientSecret) {
      this.logger.warn(
        'CLOUDFLARE_CLIENT_ID / CLOUDFLARE_CLIENT_SECRET not set — OAuth flow will not be available. ' +
        'Set them in the platform setup page or via env vars to enable OAuth-based Cloudflare connection.',
      );
    }
  }

  /**
   * Get OAuth credentials from InstallationSettings (DB), falling back to env vars.
   */
  private async getOAuthCredentials() {
    try {
      const settings = await this.prisma.installationSettings.findFirst() as any;
      if (settings?.encryptedCloudflareClientId && settings?.encryptedCloudflareClientSecret) {
        return {
          clientId: this.decryptSecret(settings.encryptedCloudflareClientId),
          clientSecret: this.decryptSecret(settings.encryptedCloudflareClientSecret),
          redirectUri: settings.cloudflareOAuthRedirectUri ?? this.envRedirectUri,
        };
      }
    } catch { /* DB not ready */ }

    // Fallback to env vars
    if (this.envClientId && this.envClientSecret) {
      return { clientId: this.envClientId, clientSecret: this.envClientSecret, redirectUri: this.envRedirectUri };
    }

    throw new UnauthorizedException(
      'Cloudflare OAuth is not configured. Set CLOUDFLARE_CLIENT_ID and CLOUDFLARE_CLIENT_SECRET ' +
      'in the platform setup page or via environment variables.',
    );
  }

  /**
   * Build the Cloudflare OAuth authorization URL.
   * The caller should redirect the user to the returned URL.
   */
  async buildAuthorizationUrl(state: string): Promise<{ url: string }> {
    const { clientId, redirectUri } = await this.getOAuthCredentials();
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });
    return { url: `${this.baseUrl}/api/v4/oauth2/authorize?${params.toString()}` };
  }

  /**
   * Exchange an authorization code for an access token,
   * then look up the user's Cloudflare account email and zones.
   * Stores the encrypted token in DomainConnection.
   */
  async completeOAuth(
    userId: string,
    projectId: string,
    code: string,
    expectedState: string,
    actualState: string,
  ): Promise<{ id: string; projectId: string; provider: string; email: string | null; createdAt: Date }> {
    const { clientId, clientSecret, redirectUri } = await this.getOAuthCredentials();

    if (actualState !== expectedState) {
      throw new UnauthorizedException('Invalid OAuth state — possible CSRF attack');
    }

    // 1. Exchange code for token
    const tokenResponse = await axios.post(
      `${this.baseUrl}/api/v4/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    );

    const { access_token, token_type } = tokenResponse.data as {
      access_token: string;
      token_type: string;
    };

    if (!access_token) {
      throw new UnauthorizedException('Cloudflare OAuth token exchange failed');
    }

    // 2. Get account email
    let email = 'unknown';
    try {
      const userResponse = await axios.get(`${this.baseUrl}/api/v4/user`, {
        headers: { Authorization: `Bearer ${access_token}` },
        timeout: 10_000,
      });
      email = (userResponse.data as { user?: { email?: string } }).user?.email ?? email;
    } catch (err) {
      this.logger.warn(`Could not fetch Cloudflare user email: ${err instanceof Error ? err.message : err}`);
    }

    // 3. Encrypt and store token
    const encryptedToken = this.encryptToken(access_token);

    // Delete any existing connection for this project, then create fresh
    await this.prisma.domainConnection.deleteMany({ where: { projectId } });

    const connection = await this.prisma.domainConnection.create({
      data: {
        projectId,
        provider: 'CLOUDFLARE',
        email,
        encryptedToken,
        permissions: { cf_oauth: true },
        lastVerifiedAt: new Date(),
      },
    });

    return {
      id: connection.id,
      projectId: connection.projectId,
      provider: connection.provider,
      email: connection.email,
      createdAt: connection.createdAt,
    };
  }

  /**
   * Get the Cloudflare zones accessible with the stored token for a project.
   */
  async getAccessibleZones(projectId: string): Promise<Array<{ id: string; name: string; status: string }>> {
    // Find by projectId since there's no unique constraint on it
    const connections = await this.prisma.domainConnection.findMany({ where: { projectId } });
    const connection = connections[0];
    if (!connection || connection.provider !== 'cloudflare') return [];

    const token = this.decryptSecret(connection.encryptedToken);
    try {
      const response = await axios.get('https://api.cloudflare.com/client/v4/zones', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      });
      return ((response.data as { result?: Array<{ id: string; name: string; status: string }> }).result ?? []);
    } catch (err) {
      this.logger.warn(`Failed to list Cloudflare zones: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  private encryptToken(token: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decryptSecret(encryptedToken: string): string {
    const key = this.getEncryptionKey();
    const [ivB64, authTagB64, encryptedB64] = encryptedToken.split(':');
    if (!ivB64 || !authTagB64 || !encryptedB64) return encryptedToken;
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
      return decipher.update(encryptedB64, 'base64', 'utf8') + decipher.final('utf8');
    } catch {
      return encryptedToken;
    }
  }

  private getEncryptionKey(): Buffer {
    const envKey = process.env[ENCRYPTION_KEY_ENV];
    if (envKey) {
      return Buffer.from(envKey, 'utf8').slice(0, 32);
    }
    const keyFile = process.env[`${ENCRYPTION_KEY_ENV}_FILE`];
    if (keyFile) {
      try { return Buffer.from(require('fs').readFileSync(keyFile, 'utf8').trim(), 'base64').slice(0, 32); } catch { /* fall through */ }
    }
    return Buffer.from('default-dev-key-32-chars-here!!', 'utf8').slice(0, 32);
  }
}
