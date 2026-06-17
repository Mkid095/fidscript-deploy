import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AddMemberDto } from '@/modules/projects/dto/add-member.dto';
import * as crypto from 'crypto';

@Injectable()
export class ProjectMemberService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async listMembers(userId: string, projectId: string) {
    await this.findProjectWithAccess(userId, projectId);

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { members: members.map(m => ({ id: m.id, role: m.role, user: m.user, createdAt: m.createdAt })) };
  }

  async addMember(userId: string, projectId: string, dto: AddMemberDto) {
    await this.checkPermission(userId, projectId, ['owner']);

    await this.prisma.project.findUnique({ where: { id: projectId } })
      .catch(() => { throw new NotFoundException('Project not found'); });

    const newUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!newUser) throw new NotFoundException('User not found');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: newUser.id } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: newUser.id, role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await this.eventService.emit('projects.member.added', {
      id: crypto.randomUUID(),
      type: 'projects.member.added',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_member',
      resourceId: member.id,
      metadata: { projectId, addedUserId: newUser.id, role: dto.role },
    });

    return { id: member.id, role: member.role, user: member.user, createdAt: member.createdAt };
  }

  async removeMember(userId: string, projectId: string, memberUserId: string) {
    await this.checkPermission(userId, projectId, ['owner']);

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    await this.eventService.emit('projects.member.removed', {
      id: crypto.randomUUID(),
      type: 'projects.member.removed',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_member',
      resourceId: member.id,
      metadata: { projectId, removedUserId: memberUserId },
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
