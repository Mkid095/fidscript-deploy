import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DomainAccessService {
  constructor(private prisma: PrismaService) {}

  async checkAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }

  async ensureAccess(userId: string, projectId: string) {
    const allowed = await this.checkAccess(userId, projectId);
    if (!allowed) throw new ForbiddenException('Access denied');
  }
}
