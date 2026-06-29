import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DomainConnectionService {
  constructor(private prisma: PrismaService) {}

  async getConnection(userId: string, projectId: string) {
    await this.ensureAccess(userId, projectId);
    const conn = await this.prisma.domainConnection.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    if (!conn) return null;
    return {
      id: conn.id,
      projectId: conn.projectId,
      provider: conn.provider,
      email: conn.email,
      lastVerifiedAt: conn.lastVerifiedAt,
      createdAt: conn.createdAt,
    };
  }

  private async ensureAccess(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ForbiddenException('Access denied');
    if (project.ownerId === userId) return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new ForbiddenException('Access denied');
  }
}