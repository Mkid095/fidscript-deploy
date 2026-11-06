import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';

const BCRYPT_ROUNDS = 12;
const PROJECT_API_KEY_BYTES = 24;
// Lookup-table prefix length. The prefix is NOT a secret — it is only used
// to narrow the candidate set for bcrypt.compare from O(n) to O(1).
const PROJECT_API_KEY_PREFIX_LEN = 8;

@Injectable()
export class ProjectApiKeyService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private eventService: EventService,
  ) {}

  async createProjectApiKey(userId: string,
    projectId: string,
    dto: { name: string; permissions?: string[]; expiresAt?: string }, keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner'], keyProjectId);

    const key = `fpk_${crypto.randomBytes(PROJECT_API_KEY_BYTES).toString('base64url')}`;
    // Hash the key BODY (without the fpk_ prefix). validateProjectApiKey strips
    // the prefix with rawKey.slice(4) before bcrypt.compare, so both sides must
    // agree on whether the prefix is included — previously they disagreed and no
    // API key ever validated.
    const body = key.slice(4);
    // Store the first N chars of the body as a non-secret index key so
    // validateProjectApiKey can find candidate rows in O(log n) instead of
    // scanning every key and running bcrypt on each.
    const keyPrefix = body.slice(0, PROJECT_API_KEY_PREFIX_LEN);
    const keyHash = await bcrypt.hash(body, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.projectApiKey.create({
      data: {
        projectId,
        name: dto.name,
        keyHash,
        keyPrefix,
        permissions: dto.permissions || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.eventService.emit('projects.api_key.created', projectId, {
      name: dto.name,
      apiKeyId: apiKey.id,
    });

    return { apiKey, key };
  }

  async listProjectApiKeys(userId: string, projectId: string, keyProjectId?: string) {
    await this.findProjectWithAccess(userId, projectId, keyProjectId);

    const keys = await this.prisma.projectApiKey.findMany({
      where: { projectId },
      select: { id: true, name: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return { apiKeys: keys };
  }

  async revokeProjectApiKey(userId: string, projectId: string, keyId: string, keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner'], keyProjectId);

    const apiKey = await this.prisma.projectApiKey.findFirst({
      where: { id: keyId, projectId },
    });
    if (!apiKey) throw new NotFoundException('API key not found');

    await this.prisma.projectApiKey.delete({ where: { id: keyId } });

    await this.eventService.emit('projects.api_key.revoked', projectId, {
      name: apiKey.name,
      apiKeyId: keyId,
    });

    return { success: true };
  }

  /**
   * Validate a raw project API key and return the associated projectId.
   * Used by the Phase 15 log ingest endpoint (X-API-Key header).
   * Returns null if the key is invalid or expired.
   */
  async validateProjectApiKey(
    rawKey: string,
  ): Promise<{ projectId: string; name: string; permissions: string[] } | null> {
    if (!rawKey.startsWith('fpk_')) return null;
    const body = rawKey.slice(4);
    const prefix = body.slice(0, PROJECT_API_KEY_PREFIX_LEN);
    // Indexed lookup narrows to a handful of rows sharing this prefix.
    // bcrypt.compare then runs only on those candidates, not on every key.
    const candidates = await this.prisma.projectApiKey.findMany({
      where: {
        keyPrefix: prefix,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, projectId: true, name: true, keyHash: true, permissions: true },
    });
    for (const key of candidates) {
      const valid = await bcrypt.compare(body, key.keyHash).catch(() => false);
      if (valid) {
        await this.prisma.projectApiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });
        // The key's scopes travel with it. They were stored but never
        // loaded, so every `@RequireScope` was a no-op for a project key.
        return {
          projectId: key.projectId,
          name: key.name,
          permissions: (key.permissions ?? []) as string[],
        };
      }
    }
    return null;
  }

  /**
   * The shared access rules — see `ProjectAccessService`. This service used
   * to carry its own copy, with the same two bugs as the others.
   */
  private findProjectWithAccess(userId: string, projectId: string, keyProjectId?: string) {
    return this.access.findProjectWithAccess(userId, projectId, keyProjectId);
  }

  private checkPermission(
    userId: string,
    projectId: string,
    allowedRoles: string[],
    keyProjectId?: string,
  ) {
    return this.access.checkPermission(userId, projectId, allowedRoles, keyProjectId);
  }
}
