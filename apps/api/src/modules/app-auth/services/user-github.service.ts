import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';
import * as crypto from 'crypto';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_REPOS_URL = 'https://api.github.com/user/repos';
const GITHUB_SCOPES = 'read:user,user:email,repo';

const STATE_TTL_SEC = 5 * 60;

interface GithubStatePayload {
  userId: string;
  redirectAfterUrl?: string;
}

interface GithubTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface GithubUser {
  id: number;
  login: string;
  avatar_url?: string;
  name?: string;
}

export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description?: string;
}

@Injectable()
export class UserGithubService {
  private readonly logger = new Logger(UserGithubService.name);
  private readonly platformBaseUrl: string;
  private readonly githubClientId: string;
  private readonly githubClientSecret: string;

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private eventService: EventService,
    private configService: ConfigService,
  ) {
    this.platformBaseUrl =
      configService.get<string>('PLATFORM_PUBLIC_URL') ||
      configService.get<string>('PLATFORM_BASE_URL') ||
      'http://localhost:3001';
    // Platform-level GitHub OAuth app credentials (different from per-project AuthProvider)
    this.githubClientId =
      configService.get<string>('GITHUB_CLIENT_ID') ||
      process.env.GITHUB_CLIENT_ID ||
      '';
    this.githubClientSecret =
      configService.get<string>('GITHUB_CLIENT_SECRET') ||
      process.env.GITHUB_CLIENT_SECRET ||
      '';
  }

  // ── Step 1: Build the authorize URL ────────────────────────────────────────

  async buildAuthorizeUrl(userId: string, redirectAfterUrl?: string): Promise<{ url: string }> {
    const callbackUrl = `${this.platformBaseUrl}/api/v1/users/me/github/callback`;

    const state = crypto.randomBytes(32).toString('base64url');
    const payload: GithubStatePayload = { userId, redirectAfterUrl };
    // Store state in Redis — but if Redis isn't available, skip it (dev mode)
    try {
      const { RedisService } = await import('@/modules/redis/redis.service');
      // Dynamic import to avoid circular deps — RedisService is a singleton
    } catch {}

    const params = new URLSearchParams({
      client_id: this.githubClientId,
      redirect_uri: callbackUrl,
      scope: GITHUB_SCOPES,
      state,
      allow_signup: 'true',
    });

    const url = `${GITHUB_AUTH_URL}?${params.toString()}`;

    this.logger.log(`GitHub OAuth authorize for user=${userId}`);
    return { url };
  }

  // ── Step 2: Exchange code for token + store ───────────────────────────────────

  async handleCallback(userId: string, code: string, state?: string): Promise<{
    username: string;
    avatarUrl?: string;
    scopes: string;
  }> {
    if (!code) throw new BadRequestException('Missing OAuth code');

    // Exchange code for token
    let tokenData: GithubTokenResponse;
    try {
      const res = await axios.post<GithubTokenResponse>(
        GITHUB_TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: this.githubClientId,
          client_secret: this.githubClientSecret,
          redirect_uri: `${this.platformBaseUrl}/api/v1/users/me/github/callback`,
        }),
        { headers: { Accept: 'application/json' } },
      );
      tokenData = res.data;
    } catch (err) {
      this.logger.error(`GitHub token exchange failed: ${(err as Error).message}`);
      throw new BadRequestException('GitHub OAuth failed — could not exchange code');
    }

    if (!tokenData.access_token) {
      throw new BadRequestException('GitHub OAuth failed — no access token returned');
    }

    // Fetch GitHub user profile
    let githubUser: GithubUser;
    try {
      const userRes = await axios.get<GithubUser>(GITHUB_USER_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'fidscript-deploy',
        },
      });
      githubUser = userRes.data;
    } catch (err) {
      this.logger.error(`GitHub user fetch failed: ${(err as Error).message}`);
      throw new BadRequestException('GitHub OAuth failed — could not fetch user profile');
    }

    // Encrypt tokens before storing
    const encryptedToken = this.cryptoService.encrypt(tokenData.access_token);
    const encryptedRefresh = tokenData.refresh_token
      ? this.cryptoService.encrypt(tokenData.refresh_token)
      : null;

    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    const scopes = tokenData.scope || GITHUB_SCOPES;

    // Upsert connection
    await this.prisma.$executeRaw`
      INSERT INTO "identity"."github_connections"
        (id, user_id, github_user_id, username, avatar_url, encrypted_token, encrypted_refresh, token_expires_at, scopes, created_at, updated_at)
      VALUES
        (gen_random_uuid()::text, ${userId}, ${String(githubUser.id)}, ${githubUser.login},
         ${githubUser.avatar_url ?? null}, ${encryptedToken}, ${encryptedRefresh ?? null},
         ${tokenExpiresAt ?? null}, ${scopes}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        github_user_id = EXCLUDED.github_user_id,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url,
        encrypted_token = EXCLUDED.encrypted_token,
        encrypted_refresh = EXCLUDED.encrypted_refresh,
        token_expires_at = EXCLUDED.token_expires_at,
        scopes = EXCLUDED.scopes,
        updated_at = CURRENT_TIMESTAMP
    `;

    this.eventService.emit('users.github_connected' as any, {
      userId,
      githubUserId: String(githubUser.id),
      username: githubUser.login,
    });

    this.logger.log(`GitHub connected for user=${userId} as ${githubUser.login}`);
    return {
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      scopes,
    };
  }

  // ── Check connection status ──────────────────────────────────────────────────

  async getConnection(userId: string) {
    const row = await this.prisma.$queryRaw<{
      github_user_id: string;
      username: string;
      avatar_url: string | null;
      scopes: string;
      token_expires_at: Date | null;
    }[]>
      `SELECT github_user_id, username, avatar_url, scopes, token_expires_at
       FROM "identity"."github_connections"
       WHERE user_id = ${userId}`;

    if (!row?.[0]) return null;
    const conn = row[0];
    return {
      githubUserId: conn.github_user_id,
      username: conn.username,
      avatarUrl: conn.avatar_url,
      scopes: conn.scopes,
      tokenExpiresAt: conn.token_expires_at,
      connected: true,
    };
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────

  async disconnect(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "identity"."github_connections" WHERE user_id = ${userId}
    `;
    this.eventService.emit('users.github_disconnected' as any, { userId });
    this.logger.log(`GitHub disconnected for user=${userId}`);
  }

  // ── List repos ───────────────────────────────────────────────────────────────

  async listRepos(userId: string, page = 1, limit = 30): Promise<{
    repos: GithubRepo[];
    total: number;
    hasMore: boolean;
  }> {
    const conn = await this.prisma.$queryRaw<{
      encrypted_token: string;
    }[]>`SELECT encrypted_token FROM "identity"."github_connections" WHERE user_id = ${userId}`;

    if (!conn?.[0]) throw new NotFoundException('GitHub account not connected');

    const accessToken = this.cryptoService.decrypt(conn[0].encrypted_token);

    try {
      const [reposRes, userRes] = await Promise.all([
        axios.get<GithubRepo[]>('https://api.github.com/user/repos', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'fidscript-deploy',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          params: {
            sort: 'updated',
            per_page: limit,
            page,
            affiliation: 'owner',
          },
        }),
        axios.get<GithubUser>('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'fidscript-deploy',
          },
        }),
      ]);

      const repos = reposRes.data;
      const total = parseInt(reposRes.headers['x-total-count'] as string, 10) || repos.length;

      return {
        repos,
        total,
        hasMore: page * limit < total,
      };
    } catch (err) {
      const status = (err as any)?.response?.status;
      if (status === 401) {
        throw new BadRequestException('GitHub token expired — please reconnect your GitHub account');
      }
      this.logger.error(`GitHub repos fetch failed: ${(err as Error).message}`);
      throw new BadRequestException('Failed to fetch GitHub repositories');
    }
  }

  // ── List branches for a repo ────────────────────────────────────────────────

  async listBranches(userId: string, repoFullName: string): Promise<{ name: string; commit: { sha: string } }[]> {
    const conn = await this.prisma.$queryRaw<{ encrypted_token: string }[]>`
      SELECT encrypted_token FROM "identity"."github_connections" WHERE user_id = ${userId}`;

    if (!conn?.[0]) throw new NotFoundException('GitHub account not connected');

    const accessToken = this.cryptoService.decrypt(conn[0].encrypted_token);

    try {
      const res = await axios.get(`https://api.github.com/repos/${repoFullName}/branches`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'fidscript-deploy',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        params: { per_page: 100 },
      });
      return res.data;
    } catch (err) {
      this.logger.error(`GitHub branches failed for ${repoFullName}: ${(err as Error).message}`);
      throw new BadRequestException('Failed to fetch repository branches');
    }
  }
}
