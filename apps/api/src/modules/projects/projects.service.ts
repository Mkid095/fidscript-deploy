import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventService } from '../../events/event.service.js';
import { AuditService } from '../../audit/audit.service.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CloneProjectDto,
  AddMemberDto,
  UpdateEnvVarsDto,
  ProjectRole,
} from './dto/index.js';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Project with this name already exists');
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        type: dto.type.toUpperCase() as any,
        ownerId: userId,
        region: dto.region,
        subdomain: slug,
      },
      include: { settings: true },
    });

    await this.prisma.projectSettings.create({
      data: { projectId: project.id },
    });

    await this.eventService.emit('project.created', { projectId: project.id, userId });
    await this.auditService.log({ userId, action: 'project.created', resourceType: 'project', resourceId: project.id });

    return this.formatProject(project);
  }

  async list(userId: string, options: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { owner: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
        ...(dto.envVars && { envVars: dto.envVars }),
        ...(dto.buildSettings && { buildSettings: dto.buildSettings }),
      },
    });

    await this.eventService.emit('project.updated', { projectId, userId });
    await this.auditService.log({ userId, action: 'project.updated', resourceType: 'project', resourceId: projectId });

    return this.formatProject(project);
  }

  async delete(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can delete project');

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'DELETED' },
    });

    await this.eventService.emit('project.deleted', { projectId, userId });
    await this.auditService.log({ userId, action: 'project.deleted', resourceType: 'project', resourceId: projectId });

    return { success: true };
  }

  async suspend(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'SUSPENDED' },
    });

    await this.eventService.emit('project.suspended', { projectId, userId });
    await this.auditService.log({ userId, action: 'project.suspended', resourceType: 'project', resourceId: projectId });

    return this.formatProject(project);
  }

  async archive(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED' },
    });

    await this.eventService.emit('project.archived', { projectId, userId });
    await this.auditService.log({ userId, action: 'project.archived', resourceType: 'project', resourceId: projectId });

    return this.formatProject(project);
  }

  async restore(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ACTIVE' },
    });

    await this.eventService.emit('project.restored', { projectId, userId });
    await this.auditService.log({ userId, action: 'project.restored', resourceType: 'project', resourceId: projectId });

    return this.formatProject(project);
  }

  async clone(userId: string, projectId: string, dto: CloneProjectDto) {
    const source = await this.findProjectWithAccess(userId, projectId);

    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Project with this name already exists');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        slug,
        description: source.description,
        type: source.type,
        ownerId: userId,
        region: source.region,
        envVars: source.envVars as any,
        buildSettings: source.buildSettings as any,
        deploymentStrategy: source.deploymentStrategy,
        sourceProvider: source.sourceProvider,
        sourceRepo: source.sourceRepo,
        sourceBranch: source.sourceBranch,
      },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    await this.eventService.emit('project.cloned', { projectId: project.id, sourceProjectId: projectId, userId });
    await this.auditService.log({ userId, action: 'project.cloned', resourceType: 'project', resourceId: project.id });

    return this.formatProject(project);
  }

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

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

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

    await this.auditService.log({
      userId,
      action: 'project.member_added',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { addedUserId: newUser.id, role: dto.role },
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

    await this.auditService.log({
      userId,
      action: 'project.member_removed',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { removedUserId: memberUserId },
    });

    return { success: true };
  }

  async getEnvVars(userId: string, projectId: string) {
    await this.findProjectWithAccess(userId, projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { envVars: true },
    });

    const envVars = project?.envVars as Record<string, string> || {};
    return { envVars: Object.entries(envVars).map(([key, value]) => ({ key, value })) };
  }

  async updateEnvVars(userId: string, projectId: string, dto: UpdateEnvVarsDto) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const envVars: Record<string, string> = {};
    for (const item of dto.envVars) {
      envVars[item.key] = item.value;
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { envVars },
    });

    await this.auditService.log({
      userId,
      action: 'project.env_vars_updated',
      resourceType: 'project',
      resourceId: projectId,
    });

    return { success: true };
  }

  async deleteEnvVar(userId: string, projectId: string, key: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { envVars: true },
    });

    const envVars = (project?.envVars as Record<string, string>) || {};
    delete envVars[key];

    await this.prisma.project.update({
      where: { id: projectId },
      data: { envVars },
    });

    return { success: true };
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

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    const random = Math.random().toString(36).substring(2, 8);
    return `${base}-${random}`;
  }

  private formatProject(project: any) {
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      type: project.type.toLowerCase(),
      status: project.status.toLowerCase(),
      ownerId: project.ownerId,
      owner: project.owner,
      region: project.region,
      subdomain: project.subdomain,
      customDomains: project.customDomains || [],
      envVars: project.envVars || {},
      buildSettings: project.buildSettings || {},
      deploymentStrategy: project.deploymentStrategy,
      sourceProvider: project.sourceProvider,
      sourceRepo: project.sourceRepo,
      sourceBranch: project.sourceBranch,
      lastDeployAt: project.lastDeployAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
