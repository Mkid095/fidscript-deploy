import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class AppAuthManagementService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async listUsers(
    projectId: string,
    actorId: string,
    page = 1,
    limit = 50,
  ) {
    const [users, total] = await Promise.all([
      this.prisma.appUser.findMany({
        where: { projectId },
        include: { roles: { include: { role: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appUser.count({ where: { projectId } }),
    ]);
    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        roles: u.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getUser(projectId: string, appUserId: string, actorId: string) {
    const user = await this.prisma.appUser.findUnique({
      where: { id: appUserId },
      include: { roles: { include: { role: true } }, oauthAccounts: true },
    });
    if (!user || user.projectId !== projectId) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
      oauthAccounts: user.oauthAccounts.map((a) => ({ provider: a.provider, providerEmail: a.providerEmail })),
    };
  }

  async disableUser(
    projectId: string,
    appUserId: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.appUser.findUnique({ where: { id: appUserId } });
    if (!user || user.projectId !== projectId) throw new NotFoundException('User not found');
    // Revoke all sessions.
    await this.prisma.appSession.updateMany({
      where: { userId: appUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.eventService.emit('auth.user_disabled', {
      projectId,
      userId: appUserId,
      disabledBy: actorId,
    }, { actorId, ipAddress, userAgent });
    return { success: true };
  }

  async assignRole(
    projectId: string,
    appUserId: string,
    roleId: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.appUser.findUnique({ where: { id: appUserId } });
    if (!user || user.projectId !== projectId) throw new NotFoundException('User not found');
    const role = await this.prisma.appRole.findUnique({ where: { id: roleId } });
    if (!role || role.projectId !== projectId) throw new NotFoundException('Role not found');
    const existing = await this.prisma.appUserRole.findUnique({
      where: { userId_roleId: { userId: appUserId, roleId } },
    });
    if (existing) return { success: true, message: 'Role already assigned' };
    await this.prisma.appUserRole.create({
      data: { userId: appUserId, roleId },
    });
    await this.eventService.emit('auth.role_assigned', {
      projectId, userId: appUserId, roleId, assignedBy: actorId,
    }, { actorId, ipAddress, userAgent });
    return { success: true };
  }
}
