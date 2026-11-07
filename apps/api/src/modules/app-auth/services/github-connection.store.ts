import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';

/**
 * The stored GitHub connection — one row per platform user.
 *
 * The token is encrypted before it is written and decrypted when it is read.
 * The encrypted form is what lives in the database; the plain form never
 * leaves this class, and never reaches a log or a response.
 */
export interface StoredGithubConnection {
  githubUserId: string;
  username: string;
  avatarUrl: string | null;
  scopes: string;
  tokenExpiresAt: Date | null;
}

export interface GithubConnectionToSave extends Omit<StoredGithubConnection, 'tokenExpiresAt'> {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
}

@Injectable()
export class GithubConnectionStore {
  private readonly logger = new Logger(GithubConnectionStore.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** Writes the connection, replacing whatever was there before. */
  async save(userId: string, connection: GithubConnectionToSave): Promise<void> {
    const encryptedToken = this.crypto.encrypt(connection.accessToken);
    const encryptedRefresh = connection.refreshToken
      ? this.crypto.encrypt(connection.refreshToken)
      : null;

    await this.prisma.$executeRaw`
      INSERT INTO "identity"."github_connections"
        (id, user_id, github_user_id, username, avatar_url, encrypted_token, encrypted_refresh, token_expires_at, scopes, created_at, updated_at)
      VALUES
        (gen_random_uuid()::text, ${userId}, ${connection.githubUserId}, ${connection.username},
         ${connection.avatarUrl ?? null}, ${encryptedToken}, ${encryptedRefresh ?? null},
         ${connection.tokenExpiresAt ?? null}, ${connection.scopes}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
  }

  /** The connection, without the token. */
  async find(userId: string): Promise<StoredGithubConnection | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        github_user_id: string;
        username: string;
        avatar_url: string | null;
        scopes: string;
        token_expires_at: Date | null;
      }>
    >`SELECT github_user_id, username, avatar_url, scopes, token_expires_at
       FROM "identity"."github_connections"
       WHERE user_id = ${userId}`;

    const row = rows?.[0];
    if (!row) return null;
    return {
      githubUserId: row.github_user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      scopes: row.scopes,
      tokenExpiresAt: row.token_expires_at,
    };
  }

  /** Removes the connection. */
  async remove(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "identity"."github_connections" WHERE user_id = ${userId}
    `;
  }

  /**
   * The stored token, decrypted.
   *
   * Null when there is no connection, or when the stored token cannot be
   * read: the caller then falls back to an anonymous clone.
   */
  async token(userId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ encrypted_token: string }>>`
      SELECT encrypted_token FROM "identity"."github_connections" WHERE user_id = ${userId}
    `;
    if (!rows?.[0]?.encrypted_token) return null;
    try {
      return this.crypto.decrypt(rows[0].encrypted_token);
    } catch (err) {
      this.logger.warn(
        `Failed to decrypt GitHub token for user=${userId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * The git-clone credentials — `x-access-token:<token>`, the username
   * GitHub expects over HTTPS.
   */
  async cloneCredentials(userId: string): Promise<string | null> {
    const token = await this.token(userId);
    return token ? `x-access-token:${token}` : null;
  }
}
