import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createTeam(userId: string, orgId: string, dto: { name: string; description?: string }, ipAddress?: string, userAgent?: string) {
    await this.checkOrgPermission(userId, orgId, 'org.teams.manage');

    const team = await this.prisma.team.create({
      data: { organizationId: orgId, name: dto.name, description: dto.description },
    });

    await this.eventService.emit('identity.team.created', null, { name: team.name, orgId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'team',
      resourceId: team.id,
      ipAddress,
      userAgent,
    });

    return team;
  }

  async listTeams(userId: string, orgId: string) {
    await this.prisma.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    return this.prisma.team.findMany({
      where: { organizationId: orgId },
      include: { members: { include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } } } },
    });
  }

  async getTeam(userId: string, orgId: string, teamId: string) {
    await this.prisma.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    return this.prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      include: { members: { include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } } } },
    });
  }

  async updateTeam(userId: string, orgId: string, teamId: string, dto: { name?: string; description?: string }, ipAddress?: string, userAgent?: string) {
    await this.checkOrgPermission(userId, orgId, 'org.teams.manage');

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: { name: dto.name, description: dto.description },
    });

    await this.eventService.emit('identity.team.updated', null, { teamId, name: team.name }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'team',
      resourceId: team.id,
      ipAddress,
      userAgent,
    });

    return team;
  }

  async deleteTeam(userId: string, orgId: string, teamId: string, ipAddress?: string, userAgent?: string) {
    await this.checkOrgPermission(userId, orgId, 'org.teams.manage');

    await this.prisma.team.delete({ where: { id: teamId } });

    await this.eventService.emit('identity.team.deleted', null, { teamId, orgId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'team',
      resourceId: teamId,
      ipAddress,
      userAgent,
    });

    return { deleted: true };
  }

  async addMember(userId: string, orgId: string, teamId: string, dto: { userId: string; role?: 'LEAD' | 'MEMBER' | 'VIEWER' }, ipAddress?: string, userAgent?: string) {
    await this.checkOrgPermission(userId, orgId, 'org.teams.manage');

    const member = await this.prisma.teamMember.create({
      data: { teamId, userId: dto.userId, role: dto.role ?? 'MEMBER' },
    });

    await this.eventService.emit('identity.team.member_added', null, { teamId, userId: dto.userId, role: dto.role }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'team',
      resourceId: teamId,
      ipAddress,
      userAgent,
    });

    return member;
  }

  async removeMember(userId: string, orgId: string, teamId: string, targetUserId: string, ipAddress?: string, userAgent?: string) {
    await this.checkOrgPermission(userId, orgId, 'org.teams.manage');

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    await this.eventService.emit('identity.team.member_removed', null, { teamId, userId: targetUserId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'team',
      resourceId: teamId,
      ipAddress,
      userAgent,
    });

    return { removed: true };
  }

  async updateMemberRole(userId: string, orgId: string, teamId: string, targetUserId: string, role: 'LEAD' | 'MEMBER' | 'VIEWER', ipAddress?: string, userAgent?: string) {
    await this.checkOrgPermission(userId, orgId, 'org.teams.manage');

    const updated = await this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role },
    });

    await this.eventService.emit('identity.team.member_role_changed', null, { teamId, userId: targetUserId, role }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'team',
      resourceId: teamId,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  private async checkOrgPermission(userId: string, orgId: string, permission: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');

    const perms = member.role.permissions as string[];
    if (perms.includes('*')) return;
    const parts = permission.split('.');
    for (const p of perms) {
      if (p === permission) return;
      if (p.endsWith('.*') && permission.startsWith(p.slice(0, -1))) return;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
