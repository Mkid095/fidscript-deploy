import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AddMemberDto } from '@/modules/projects/dto/add-member.dto';
import * as crypto from 'crypto';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';

@Injectable()
export class ProjectMemberService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private eventService: EventService,
  ) {}

  async listMembers(userId: string, projectId: string, keyProjectId?: string) {
    await this.findProjectWithAccess(userId, projectId, keyProjectId);

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { members: members.map(m => ({ id: m.id, role: m.role, user: m.user, createdAt: m.createdAt })) };
  }

  async addMember(userId: string, projectId: string, dto: AddMemberDto, keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['owner'], keyProjectId);

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

    await this.eventService.emit('projects.member.added', projectId, {
      addedUserId: newUser.id,
      role: dto.role,
    });

    return { id: member.id, role: member.role, user: member.user, createdAt: member.createdAt };
  }

  async removeMember(userId: string, projectId: string, memberUserId: string, keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['owner'], keyProjectId);

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    await this.eventService.emit('projects.member.removed', projectId, {
      removedUserId: memberUserId,
    });

    return { success: true };
  }

  /**
   * Change a member's role. Owner-only. The 'owner' role is reserved for the
   * project owner (the user identified by Project.ownerId); demoting yourself
   * to a non-owner role is allowed ONLY if there is another owner to take over.
   * For now, we don't allow promoting anyone to 'owner' via this endpoint —
   * ownership transfer is a separate workflow.
   */
  async updateMemberRole(userId: string,
    projectId: string,
    memberUserId: string,
    role: 'admin' | 'developer' | 'viewer', keyProjectId?: string) {
    await this.checkPermission(userId, projectId, ['owner'], keyProjectId);

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === role) return member;

    const updated = await this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: memberUserId } },
      data: { role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await this.eventService.emit('projects.member.role_changed', projectId, {
      memberUserId,
      oldRole: member.role,
      newRole: role,
      changedBy: userId,
    });

    return {
      id: updated.id,
      role: updated.role,
      user: updated.user,
      createdAt: updated.createdAt,
    };
  }

  /**
   * The shared access rules.
   *
   * This service used to carry its own copies of them — three of them, in
   * four services, each slightly different, each with the same two bugs: an
   * API-key caller was waved through, and the role check returned before the
   * member was looked up. There is one implementation now.
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
