import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateProjectDto, UpdateProjectDto, CloneProjectDto } from '@/modules/projects/dto/index';
import * as crypto from 'crypto';

@Injectable()
export class ProjectCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Project with this name already exists');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name, slug, description: dto.description,
        type: dto.type.toUpperCase() as any, ownerId: userId,
        region: dto.region, subdomain: slug,
      },
      include: { settings: true },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    await this.eventService.emit('projects.project.created', {
      id: crypto.randomUUID(), type: 'projects.project.created',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: project.id,
      metadata: { name: project.name, slug: project.slug },
    });

    return this.formatProject(project);
  }

  async list(userId: string, options: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where: any = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };
    if (status) where.status = status.toUpperCase();

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { owner: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      projects: projects.map(p => this.formatProject(p)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async get(userId: string, projectId: string) {
    const project = await this.findProjectWithAccess(userId, projectId);
    return this.formatProject(project);
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);
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
    return this.formatProject(project);
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
    await this.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'SUSPENDED' },
    });
    await this.eventService.emit('projects.project.suspended', {
      id: crypto.randomUUID(), type: 'projects.project.suspended',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return this.formatProject(project);
  }

  async archive(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'ARCHIVED' },
    });
    await this.eventService.emit('projects.project.archived', {
      id: crypto.randomUUID(), type: 'projects.project.archived',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return this.formatProject(project);
  }

  async restore(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'ACTIVE' },
    });
    await this.eventService.emit('projects.project.restored', {
      id: crypto.randomUUID(), type: 'projects.project.restored',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: projectId, metadata: {},
    });
    return this.formatProject(project);
  }

  async clone(userId: string, projectId: string, dto: CloneProjectDto) {
    const source = await this.findProjectWithAccess(userId, projectId);
    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Project with this name already exists');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name, slug, description: source.description,
        type: source.type, ownerId: userId, region: source.region,
        buildSettings: source.buildSettings as any,
        deploymentStrategy: source.deploymentStrategy,
        sourceProvider: source.sourceProvider,
        sourceRepo: source.sourceRepo,
        sourceBranch: source.sourceBranch,
      },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    const envVars = await this.prisma.projectEnv.findMany({ where: { projectId } });
    for (const envVar of envVars) {
      await this.prisma.projectEnv.create({
        data: { projectId: project.id, key: envVar.key, value: envVar.value },
      });
    }

    await this.eventService.emit('projects.project.cloned', {
      id: crypto.randomUUID(), type: 'projects.project.cloned',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'project', resourceId: project.id,
      metadata: { sourceProjectId: projectId },
    });

    return this.formatProject(project);
  }

  formatProject(project: any) {
    return {
      id: project.id, name: project.name, slug: project.slug,
      description: project.description, type: project.type?.toLowerCase(),
      status: project.status?.toLowerCase(), ownerId: project.ownerId,
      owner: project.owner, region: project.region, subdomain: project.subdomain,
      customDomains: project.customDomains || [], buildSettings: project.buildSettings || {},
      deploymentStrategy: project.deploymentStrategy, sourceProvider: project.sourceProvider,
      sourceRepo: project.sourceRepo, sourceBranch: project.sourceBranch,
      lastDeployAt: project.lastDeployAt, createdAt: project.createdAt, updatedAt: project.updatedAt,
    };
  }

  private generateSlug(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    return `${base}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private async findProjectWithAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!isOwner && !isMember) throw new ForbiddenException('Access denied');
    return project;
  }

  async checkPermission(userId: string, projectId: string, allowedRoles: string[]) {
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
