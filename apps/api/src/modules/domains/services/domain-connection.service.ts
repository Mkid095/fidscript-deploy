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

  /**
   * Remove the connection.
   *
   * The token goes with it. The domains are not touched — they are the
   * project's, and the records already set stay set.
   */
  async disconnectConnection(userId: string, projectId: string) {
    await this.ensureAccess(userId, projectId);
    const { count } = await this.prisma.domainConnection.deleteMany({ where: { projectId } });
    return { disconnected: count > 0 };
  }

  private async ensureAccess(userId: string, projectId: string): Promise<void> {
    // API-key callers already passed ProjectMemberGuard — allow through.
    if (userId === 'api-key') return;
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ForbiddenException('Access denied');
    if (project.ownerId === userId) return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new ForbiddenException('Access denied');
  }
}