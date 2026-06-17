import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { UpdateEnvVarsDto } from '@/modules/projects/dto/env-vars.dto';
import * as crypto from 'crypto';

@Injectable()
export class ProjectEnvService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
  ) {}

  async getEnvVars(userId: string, projectId: string) {
    await this.findProjectWithAccess(userId, projectId);

    const rows = await this.prisma.projectEnv.findMany({
      where: { projectId },
      orderBy: { key: 'asc' },
    });

    const envVars = rows.map(row => {
      let value = '[encrypted]';
      try {
        value = this.cryptoService.decrypt(row.value);
      } catch {
        value = '[decrypt error]';
      }
      return { key: row.key, value };
    });

    return { envVars };
  }

  async updateEnvVars(userId: string, projectId: string, dto: UpdateEnvVarsDto) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    for (const item of dto.envVars) {
      const encrypted = this.cryptoService.encrypt(item.value);
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: item.key } },
        create: { projectId, key: item.key, value: encrypted },
        update: { value: encrypted },
      });
    }

    await this.eventService.emit('projects.env_var.updated', {
      id: crypto.randomUUID(),
      type: 'projects.env_var.updated',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { keys: dto.envVars.map(e => e.key) },
    });

    return { success: true };
  }

  async deleteEnvVar(userId: string, projectId: string, key: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    await this.prisma.projectEnv.deleteMany({ where: { projectId, key } });

    await this.eventService.emit('projects.env_var.deleted', {
      id: crypto.randomUUID(),
      type: 'projects.env_var.deleted',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { key },
    });

    return { success: true };
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
