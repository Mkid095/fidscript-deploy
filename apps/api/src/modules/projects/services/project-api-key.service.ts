import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
const PROJECT_API_KEY_BYTES = 24;

@Injectable()
export class ProjectApiKeyService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createProjectApiKey(
    userId: string,
    projectId: string,
    dto: { name: string; permissions?: string[]; expiresAt?: string },
  ) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const key = `fpk_${crypto.randomBytes(PROJECT_API_KEY_BYTES).toString('base64url')}`;
    const keyHash = await bcrypt.hash(key, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.projectApiKey.create({
      data: {
        projectId,
        name: dto.name,
        keyHash,
        permissions: dto.permissions || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.eventService.emit('projects.api_key.created', {
      id: crypto.randomUUID(),
      type: 'projects.api_key.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_api_key',
      resourceId: apiKey.id,
      metadata: { projectId, name: dto.name },
    });

    return { apiKey, key };
  }

  async listProjectApiKeys(userId: string, projectId: string) {
    await this.findProjectWithAccess(userId, projectId);

    const keys = await this.prisma.projectApiKey.findMany({
      where: { projectId },
      select: { id: true, name: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return { apiKeys: keys };
  }

  async revokeProjectApiKey(userId: string, projectId: string, keyId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const apiKey = await this.prisma.projectApiKey.findFirst({
      where: { id: keyId, projectId },
    });
    if (!apiKey) throw new NotFoundException('API key not found');

    await this.prisma.projectApiKey.delete({ where: { id: keyId } });

    await this.eventService.emit('projects.api_key.revoked', {
      id: crypto.randomUUID(),
      type: 'projects.api_key.revoked',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_api_key',
      resourceId: keyId,
      metadata: { projectId, name: apiKey.name },
    });

    return { success: true };
  }

  /**
   * Validate a raw project API key and return the associated projectId.
   * Used by the Phase 15 log ingest endpoint (X-API-Key header).
   * Returns null if the key is invalid or expired.
   */
  async validateProjectApiKey(rawKey: string): Promise<{ projectId: string; name: string } | null> {
    if (!rawKey.startsWith('fpk_')) return null;
    const keys = await this.prisma.projectApiKey.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, projectId: true, name: true, keyHash: true },
    });
    for (const key of keys) {
      const valid = await bcrypt.compare(rawKey.slice(4), key.keyHash).catch(() => false);
      if (valid) {
        await this.prisma.projectApiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });
        return { projectId: key.projectId, name: key.name };
      }
    }
    return null;
  }

  private async findProjectWithAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!isOwner && !isMember) throw new ForbiddenException('Access denied');
    return project;
  }

  private async checkPermission(userId: string, projectId: string, allowedRoles: string[]) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    if (isOwner || allowedRoles.includes('owner')) return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member || !allowedRoles.includes(member.role.toLowerCase())) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
