import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Who may read a project's secrets.
 *
 * The access service answers "may this caller **act** on this project?". This
 * one answers a different question: "may this caller **read the credentials**
 * behind it?". They are not the same — a developer may deploy a project and
 * still have no business reading another member's API keys.
 *
 * The project's owner and its admins may; everyone else may use the
 * resources but not read the credentials behind them. It never throws — the
 * answer is a yes or a no, not an error.
 */
@Injectable()
export class ProjectSecretAccessService {
  constructor(private prisma: PrismaService) {}

  async canSeeSecrets(userId: string, projectId: string): Promise<boolean> {
    if (userId === 'api-key') return false;
    let project = await this.prisma.project.findUnique({
      where: { slug: projectId },
      select: { id: true, ownerId: true },
    });
    if (!project) {
      project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, ownerId: true },
      });
    }
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
      select: { role: true },
    });
    const role = (member?.role ?? '').toLowerCase();
    return role === 'admin' || role === 'owner';
  }
}
