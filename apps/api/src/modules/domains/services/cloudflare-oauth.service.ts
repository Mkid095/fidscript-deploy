import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainAccessService } from './domain-access.service';
import { resolveEncryptionKey } from '@/common/secrets';
import * as crypto from 'crypto';
import axios from 'axios';

const SCOPES = ['zone:read', 'dns:edit', 'account:read'].join(' ');
/** How long an OAuth state stays valid. */
const STATE_TTL_MS = 10 * 60 * 1000;

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
   * Redirect URI is always derived from platformDomain to avoid drift.
   */
  private async getOAuthCredentials() {
    let platformDomain: string | undefined;
    let dbClientId: string | undefined;
    let dbClientSecret: string | undefined;

    try {
      const settings = await this.prisma.installationSettings.findFirst() as any;
      if (settings?.encryptedCloudflareClientId && settings?.encryptedCloudflareClientSecret) {
        // DB is source of truth — only use if cloudflareOAuthEnabled
        if (!settings.cloudflareOAuthEnabled) {
          throw new UnauthorizedException('Cloudflare OAuth is not enabled in platform settings.');
        }
        dbClientId = this.decryptSecret(settings.encryptedCloudflareClientId);
        dbClientSecret = this.decryptSecret(settings.encryptedCloudflareClientSecret);
        platformDomain = settings.platformDomain;
      }
    } catch { /* DB not ready — fall through to env */ }

    const clientId = dbClientId ?? this.envClientId;
    const clientSecret = dbClientSecret ?? this.envClientSecret;
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        'Cloudflare OAuth is not configured. Set credentials in platform setup ' +
        'or via CLOUDFLARE_CLIENT_ID / CLOUDFLARE_CLIENT_SECRET environment variables.',
      );
    }

    // Derive redirect URI from platformDomain (never stored — avoids drift)
    const redirectUri = platformDomain
      ? `https://${platformDomain}/api/callback/cloudflare`
      : this.envRedirectUri;

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Build the Cloudflare OAuth authorization URL.
   * The caller should redirect the user to the returned URL.
   */
  /**
   * The state the platform issues for an OAuth round trip.
   *
   * It is a SIGNED value carrying the project it was issued for, the person
   * it was issued to, a nonce and an expiry. The callback checks the
   * signature and that the project matches — so a state cannot be minted
   * for one project and used on another.
   *
   * It used to be a bare random string, and the callback compared the
   * client's copy with ITSELF (`body.state` passed as both the expected and
   * the actual value), so the check could never fail and the endpoint
   * accepted any state at all — along with any project id.
   */
  createState(projectId: string, userId: string): string {
    const payload = {
      projectId,
      userId,
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: Date.now() + STATE_TTL_MS,
    };
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${body}.${this.signState(body)}`;
  }

  /** Check a state and return what it was issued for. */
  verifyState(state: string): { projectId: string; userId: string } {
    const [body, signature] = String(state ?? '').split('.');
    if (!body || !signature) {
      throw new UnauthorizedException('Invalid OAuth state — possible CSRF attack');
    }
    const expected = this.signState(body);
    const given = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
      throw new UnauthorizedException('Invalid OAuth state — possible CSRF attack');
    }
    let payload: { projectId?: string; userId?: string; exp?: number };
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid OAuth state — possible CSRF attack');
    }
    if (!payload.projectId || !payload.userId) {
      throw new UnauthorizedException('Invalid OAuth state — possible CSRF attack');
    }
    if (typeof payload.exp === 'number' && payload.exp < Date.now()) {
      throw new UnauthorizedException('The OAuth state has expired');
    }
    return { projectId: payload.projectId, userId: payload.userId };
  }

  /** Sign the state with a key derived from the platform's encryption key. */
  private signState(body: string): string {
    return crypto
      .createHmac('sha256', this.getEncryptionKey())
      .update(`state:${body}`, 'utf8')
      .digest('base64url');
  }

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
    projectId: string,
    code: string,
    state: string,
  ): Promise<{ id: string; projectId: string; provider: string; email: string | null; createdAt: Date }> {
    // The state is checked FIRST: it is the platform's own, signed, and it
    // says which project and which person the round trip was started for. A
    // state issued for one project cannot be used on another, and a forged
    // one is refused before anything else happens.
    const issued = this.verifyState(state);
    if (issued.projectId !== projectId) {
      throw new UnauthorizedException('The OAuth state was issued for a different project');
    }
    const userId = issued.userId;

    const { clientId, clientSecret, redirectUri } = await this.getOAuthCredentials();

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
    if (!connection || (connection.provider || '').toUpperCase() !== 'CLOUDFLARE') return [];

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

  /**
   * Test Cloudflare OAuth credentials by exchanging a dummy code.
   * Does NOT store anything — validates that credentials are functional.
   * Returns { valid: true } on success, throws UnauthorizedException on failure.
   */
  async testConnection(clientId: string, clientSecret: string): Promise<{ valid: true; email?: string }> {
    // Derive redirect URI for validation (use env fallback — doesn't matter for token exchange)
    const redirectUri = this.envRedirectUri;
    try {
      // Try a token exchange with an invalid code — if we get a 401 with
      // "invalid_grant" it means the client credentials are valid (just the code is bad).
      // Any other error means credentials themselves are bad.
      await axios.post(
        `${this.baseUrl}/api/v4/oauth2/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: 'test_invalid_code_for_validation_only',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
      );
      return { valid: true }; // Should not reach here — Cloudflare will reject the code
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string; error_description?: string } | undefined;
        // invalid_grant means credentials are valid (code was intentionally wrong)
        if (data?.error === 'invalid_grant') {
          return { valid: true };
        }
        // invalid_client means credentials themselves are wrong
        if (data?.error === 'invalid_client') {
          throw new UnauthorizedException(
            `Invalid Cloudflare OAuth credentials: ${data.error_description ?? data.error}`,
          );
        }
        throw new UnauthorizedException(
          `Cloudflare OAuth test failed: ${data?.error_description ?? err.message}`,
        );
      }
      throw new UnauthorizedException(`Cloudflare OAuth connection test failed: ${err instanceof Error ? err.message : String(err)}`);
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
    // One resolution for the whole platform — and it fails closed.
    return resolveEncryptionKey(this.configService);
  }
}
