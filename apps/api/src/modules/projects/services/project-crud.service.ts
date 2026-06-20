import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { ProjectAccessService } from './project-access.service';
import { ProjectFormatService } from './project-format.service';
import { ProjectCreateService } from './project-create.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private access: ProjectAccessService,
    private format: ProjectFormatService,
    private createService: ProjectCreateService,
  ) {}

  async create(userId: string, dto: any) {
    return this.createService.create(userId, dto);
  }

  async list(userId: string, options: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where: any = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };
    if (status) where.status = status.toUpperCase();

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true, name: true } },
          members: { where: { userId }, select: { role: true } },
        },
        orderBy: { updatedAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      projects: projects.map(p => {
        const role = p.ownerId === userId ? 'owner' : (p.members[0]?.role ?? 'viewer');
        return this.format.formatProject(p, { role });
      }),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async get(userId: string, projectId: string) {
    const project = await this.access.findProjectWithAccess(userId, projectId);
    const role = project.ownerId === userId ? 'owner' : (
      await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      })
    )?.role ?? 'viewer';
    return this.format.formatProject(project, { role });
  }

  async update(userId: string, projectId: string, dto: any) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.buildSettings && { buildSettings: dto.buildSettings }),
      },
    });
    await this.eventService.emit('projects.project.updated', {
      id: crypto.randomUUID(), type: 'projects.project.updated',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: dto,
    });
    return this.format.formatProject(project);
  }

  async delete(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can delete project');

    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'DELETED' } });
    await this.eventService.emit('projects.project.deleted', {
      id: crypto.randomUUID(), type: 'projects.project.deleted',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return { success: true };
  }

  async suspend(userId: string, projectId: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'SUSPENDED' },
    });
    await this.eventService.emit('projects.project.suspended', {
      id: crypto.randomUUID(), type: 'projects.project.suspended',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return this.format.formatProject(project);
  }

  async archive(userId: string, projectId: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'ARCHIVED' },
    });
    await this.eventService.emit('projects.project.archived', {
      id: crypto.randomUUID(), type: 'projects.project.archived',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return this.format.formatProject(project);
  }

  async restore(userId: string, projectId: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'ACTIVE' },
    });
    await this.eventService.emit('projects.project.restored', {
      id: crypto.randomUUID(), type: 'projects.project.restored',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return this.format.formatProject(project);
  }

  async clone(userId: string, projectId: string, dto: any) {
    return this.createService.clone(userId, projectId, dto, this.access.findProjectWithAccess.bind(this.access));
  }

  /**
   * Get the last N platform events for a project (activity feed).
   * Covers: project lifecycle, deployments, members, env vars, api keys.
   */
  async getProjectEvents(userId: string, projectId: string, limit = 20) {
    // Verify access
    await this.access.findProjectWithAccess(userId, projectId);

    // Collect related resource IDs for this project
    const [deployments, members] = await Promise.all([
      this.prisma.deployment.findMany({ where: { projectId }, select: { id: true } }),
      this.prisma.projectMember.findMany({ where: { projectId }, select: { id: true } }),
    ]);
    const deploymentIds = deployments.map(d => d.id);
    const memberIds = members.map(m => m.id);

    // Query events across all project-scoped resource types
    const events = await this.prisma.platformEvent.findMany({
      where: {
        OR: [
          { resourceType: 'project', resourceId: projectId },
          ...(deploymentIds.length ? [{ resourceType: 'deployment', resourceId: { in: deploymentIds } }] : []),
          ...(memberIds.length ? [{ resourceType: 'member', resourceId: { in: memberIds } }] : []),
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events;
  }
}
