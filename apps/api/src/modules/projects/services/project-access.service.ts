import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async findProjectWithAccess(userId: string, projectId: string) {
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