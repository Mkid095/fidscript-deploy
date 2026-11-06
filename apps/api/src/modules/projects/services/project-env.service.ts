import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { UpdateEnvVarsDto } from '@/modules/projects/dto/env-vars.dto';
import * as crypto from 'crypto';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';

@Injectable()
export class ProjectEnvService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private eventService: EventService,
    private cryptoService: CryptoService,
  ) {}

  async getEnvVars(userId: string, projectId: string, keyProjectId?: string) {
    const project = await this.findProjectWithAccess(userId, projectId, keyProjectId);
    const member = project.ownerId === userId
      ? null
      : await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId } },
        select: { role: true },
      });
    const canReveal = project.ownerId === userId || member?.role.toLowerCase() === 'admin';

    const rows = await this.prisma.projectEnv.findMany({
      where: { projectId: project.id },
      orderBy: { key: 'asc' },
    });

    const envVars = rows.map(row => {
      let value = '[masked]';
      if (canReveal) {
        try {
          value = this.cryptoService.decrypt(row.value);
        } catch {
          value = '[decrypt error]';
        }
      }
      return { key: row.key, value, encrypted: true };
    });

    return { envVars };
  }

  async updateEnvVars(userId: string, projectId: string, dto: UpdateEnvVarsDto, keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner'], keyProjectId);

    for (const item of dto.envVars) {
      const encrypted = this.cryptoService.encrypt(item.value);
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: item.key } },
        create: { projectId, key: item.key, value: encrypted },
        update: { value: encrypted },
      });
    }

    await this.eventService.emit('projects.env_var.updated', projectId, {
      keys: dto.envVars.map(e => e.key),
    });

    return { success: true };
  }

  async deleteEnvVar(userId: string, projectId: string, key: string, keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner'], keyProjectId);

    await this.prisma.projectEnv.deleteMany({ where: { projectId, key } });

    await this.eventService.emit('projects.env_var.deleted', projectId, { key });

    return { success: true };
  }

  /**
   * The shared access rules — see `ProjectAccessService`. This service used
   * to carry its own copies, with the same two bugs as the others: an
   * API-key caller was waved through, and the role check never ran.
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
