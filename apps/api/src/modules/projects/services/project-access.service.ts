import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async findProjectWithAccess(userId: string, projectId: string) {
    // API-key callers already passed ProjectMemberGuard — allow through.
    // Return a pseudo-project so TypeScript return type is satisfied; callers
    // that actually use the project data are not reachable for api-key callers
    // because ProjectMemberGuard short-circuits before the controller action.
    if (userId === 'api-key') return { id: projectId } as any;
    // Accept both UUID (e.g. 9b3a1c2e-...) and slug (e.g. kennedy-test).
    // Try slug first for prettier URLs, fall back to UUID for backwards compat.
    let project = await this.prisma.project.findUnique({
      where: { slug: projectId },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!project) {
      project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { owner: { select: { id: true, email: true, name: true } } },
      });
    }
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    if (!isOwner && !isMember) throw new ForbiddenException('Access denied');
    return project;
  }

  async checkPermission(userId: string, projectId: string, allowedRoles: string[]) {
    if (userId === 'api-key') return;
    // Accept both slug and UUID — same dual-lookup as findProjectWithAccess.
    let project = await this.prisma.project.findUnique({ where: { slug: projectId } });
    if (!project) {
      project = await this.prisma.project.findUnique({ where: { id: projectId } });
    }
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    if (isOwner || allowedRoles.includes('owner')) return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    if (!member || !allowedRoles.includes(member.role.toLowerCase())) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}