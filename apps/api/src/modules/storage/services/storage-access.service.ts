import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class StorageAccessService {
  constructor(private prisma: PrismaService) {}

  async checkProjectAccess(userId: string, projectId: string) {
    if (userId === 'api-key') {
      return { id: projectId, slug: projectId, ownerId: projectId } as {
        id: string; slug: string; ownerId: string;
      };
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, ownerId: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const isOwner = project.ownerId === userId;
    const isMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!isOwner && !isMember) throw new ForbiddenException('Access denied');

    return project;
  }
}