import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;
const CREDENTIAL_BYTES = 24;
const CREDENTIAL_PREFIX_LEN = 8;

export interface CredentialType {
  type: 'api_key' | 'pat' | 'oauth' | 'cli' | 'mcp' | 'webhook_secret' | 'jwt';
  prefix: string; // e.g. 'fpk_' for api_key, 'pat_' for PAT
}

const PREFIX_BY_TYPE: Record<string, string> = {
  api_key: 'fpk_',
  pat: 'pat_',
  cli: 'cli_',
  mcp: 'mcp_',
  webhook_secret: 'whk_',
  oauth: 'oat_',
  jwt: 'jwt_',
};

export interface CreateCredentialInput {
  projectId: string;
  type: keyof typeof PREFIX_BY_TYPE extends string ? string : string;
  name: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

/**
 * CredentialsService — unified project credential store.
 *
 * Replaces the per-service `*ApiKey` tables (EmailApiKey, SmtpCredential,
 * etc.) and complements `ProjectApiKeyService` (which keeps the existing
 * `fpk_` validator path during the migration window).
 *
 * One model covers every credential type: API key, PAT, OAuth, CLI, MCP,
 * webhook secret. The `scopes` field is a string array — Supabase-style —
 * so a single credential can gate operations across multiple services.
 *
 * Lookup is O(log n): the bcrypt comparison is run only on candidates
 * that share the same `keyPrefix` (the first 8 chars of the secret body).
 * This avoids the O(n) scan that was a security finding — same pattern
 * `ProjectApiKeyService` uses.
 */
@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new credential. Returns the plaintext secret once — the
   * caller is responsible for showing it to the user (e.g. dashboard
   * "Copy this key" modal). The plaintext is never persisted; only the
   * bcrypt hash.
   */
  async create(input: CreateCredentialInput): Promise<{ id: string; secret: string; credential: unknown }> {
    const typePrefix = PREFIX_BY_TYPE[input.type] ?? 'fpk_';
    const body = crypto.randomBytes(CREDENTIAL_BYTES).toString('base64url');
    const secret = `${typePrefix}${body}`;
    const bodyHash = await bcrypt.hash(body, BCRYPT_ROUNDS);
    const keyPrefix = body.slice(0, CREDENTIAL_PREFIX_LEN);

    const credential = await this.prisma.credential.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        name: input.name,
        keyHash: bodyHash,
        keyPrefix,
        scopes: input.scopes ?? [],
        metadata: (input.metadata ?? {}) as any,
        expiresAt: input.expiresAt ?? null,
      },
    });
    return { id: credential.id, secret, credential };
  }

  /**
   * Validate a raw secret (e.g. the value of an `X-API-Key` header).
   * Returns the credential metadata on success; `null` on miss.
   */
  async validate(rawKey: string): Promise<{
    projectId: string;
    name: string;
    scopes: string[];
    type: string;
    credentialId: string;
  } | null> {
    // Find the type prefix to strip it
    const typePrefix = Object.values(PREFIX_BY_TYPE).find((p) => rawKey.startsWith(p));
    if (!typePrefix) return null;
    const body = rawKey.slice(typePrefix.length);
    if (body.length < CREDENTIAL_PREFIX_LEN) return null;
    const prefix = body.slice(0, CREDENTIAL_PREFIX_LEN);

    // Indexed lookup narrows to a handful of rows sharing this prefix.
    // bcrypt.compare then runs only on those candidates.
    const candidates = await this.prisma.credential.findMany({
      where: {
        keyPrefix: prefix,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        keyHash: true,
        scopes: true,
        type: true,
      },
    });
    for (const c of candidates) {
      const ok = await bcrypt.compare(body, c.keyHash);
      if (ok) {
        // Fire-and-forget last-used update
        void this.prisma.credential
          .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
          .catch(() => undefined);
        return {
          projectId: c.projectId,
          name: c.name,
          scopes: c.scopes,
          type: c.type,
          credentialId: c.id,
        };
      }
    }
    return null;
  }

  /**
   * List credentials in a project. Never returns the secret.
   */
  async list(projectId: string): Promise<
    Array<{
      id: string;
      type: string;
      name: string;
      scopes: string[];
      metadata: Record<string, unknown>;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      createdAt: Date;
    }>
  > {
    const rows = await this.prisma.credential.findMany({
      where: { projectId },
      select: {
        id: true,
        type: true,
        name: true,
        scopes: true,
        metadata: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      scopes: r.scopes,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      lastUsedAt: r.lastUsedAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Revoke a credential. Idempotent.
   */
  async revoke(projectId: string, credentialId: string): Promise<boolean> {
    const c = await this.prisma.credential.findFirst({
      where: { id: credentialId, projectId },
    });
    if (!c) return false;
    await this.prisma.credential.delete({ where: { id: credentialId } });
    return true;
  }

  /**
   * Issue a default project API key with all standard scopes. Called by
   * the ProvisioningService on project creation. The plaintext is
   * returned for one-time display.
   */
  async issueDefaultProjectKey(projectId: string, projectName: string): Promise<{ secret: string; scopes: string[] }> {
    const { secret } = await this.create({
      projectId,
      type: 'api_key',
      name: `${projectName} default key`,
      scopes: [
        'email.send',
        'email.read',
        'storage.read',
        'storage.write',
        'database.read',
        'database.write',
        'auth.users',
        'functions.invoke',
        'logs.read',
        'monitoring.read',
      ],
    });
    return { secret, scopes: [] };
  }
}
