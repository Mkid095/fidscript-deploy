import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DomainAccessService {
  constructor(private prisma: PrismaService) {}

  async checkAccess(userId: string, projectId: string): Promise<boolean> {
    if (userId === 'api-key') return true;
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }

  async ensureAccess(userId: string, projectId: string) {
    // API-key callers already passed ProjectMemberGuard (which verified project
    // membership upstream). userId is 'api-key' — always allow.
    if (userId === 'api-key') return;
    const allowed = await this.checkAccess(userId, projectId);
    if (!allowed) throw new ForbiddenException('Access denied');
  }
}
