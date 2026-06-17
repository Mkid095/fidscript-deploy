import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AppAuthRoleService {
  constructor(private prisma: PrismaService) {}

  async createRole(projectId: string, dto: any) {
    const existing = await this.prisma.appRole.findFirst({
      where: { projectId, name: dto.name },
    });
    if (existing) throw new ConflictException('Role already exists');

    const role = await this.prisma.appRole.create({
      data: {
        projectId,
        name: dto.name,
        permissions: dto.permissions || [],
      },
    });

    return role;
  }

  async listRoles(projectId: string) {
    return this.prisma.appRole.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async assignRole(projectId: string, dto: any) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.appRole.findFirst({
      where: { projectId, name: dto.roleName },
    });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.appUserRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });

    return { userId: user.id, roleId: role.id, roleName: role.name };
  }

  async getUserRoles(userId: string) {
    const roles = await this.prisma.appUserRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.map(r => r.role);
  }
}
