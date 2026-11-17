import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { ProjectAccessService } from './project-access.service';
import { ProjectFormatService } from './project-format.service';
import { ProjectCreateService } from './project-create.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private access: ProjectAccessService,
    private format: ProjectFormatService,
    private createService: ProjectCreateService,
    private workspace: ProjectWorkspaceService,
  ) {}

  async create(userId: string, dto: any) {
    return this.createService.create(userId, dto);
  }

  async list(userId: string, options: { status?: string; page?: number; limit?: number; includeDeleted?: boolean } = {}) {
    const { status, page = 1, limit = 20, includeDeleted = false } = options;
    const skip = (page - 1) * limit;
    // A project in a team the person belongs to is theirs to work in, even
    // though they did not create it — so the list has to reach into the
    // workspaces, not just the projects they own.
    const workspaceIds = await this.workspace.workspaceIds(userId);
    const where: any = {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
        ...(workspaceIds.length ? [{ organizationId: { in: workspaceIds } }] : []),
      ],
      ...(status ? { status: status.toUpperCase() } : {}),
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true, name: true } },
          members: { where: { userId }, select: { role: true } },
          organization: { select: { id: true, name: true, slug: true } },
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

  async get(userId: string, projectId: string, callerKeyProjectId?: string) {
    const project = await this.access.findProjectWithAccess(userId, projectId, callerKeyProjectId);
    // For API-key callers, findProjectWithAccess returns only { id } — fetch full data.
    if (userId === 'api-key' || !('ownerId' in project)) {
      const full = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { owner: { select: { id: true, email: true, name: true } } },
      });
      if (!full) throw new NotFoundException('Project not found');
      return this.format.formatProject(full, { role: 'viewer' });
    }
    const role = project.ownerId === userId ? 'owner' : (
      await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      })
    )?.role ?? 'viewer';
    return this.format.formatProject(project, { role });
  }

  async update(userId: string, projectId: string, dto: any, callerKeyProjectId?: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner'], callerKeyProjectId);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.buildSettings && { buildSettings: dto.buildSettings }),
        // The shape and the deployment switch. Changing the shape changes the
        // project's menu; nothing is deleted.
        ...(dto.shape && { shape: dto.shape }),
        ...(dto.deploymentOn !== undefined && { deploymentOn: dto.deploymentOn }),
      },
    });
    await this.eventService.emit('projects.project.updated', projectId, dto);
    return this.format.formatProject(project);
  }

  async delete(userId: string, projectId: string, callerKeyProjectId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    // Deleting a project is an owner's act. A key is never the owner.
    if (userId === 'api-key') {
      throw new ForbiddenException('An API key cannot delete a project');
    }
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can delete project');
    if (project.deletedAt) throw new ForbiddenException('Project is already deleted');

    // Soft delete: set deletedAt, keep the record for 30-day recovery window
    await this.prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    await this.eventService.emit('projects.project.deleted', projectId, {
      soft: true,
    });
    return { success: true, deletedAt: new Date() };
  }

  /**
   * Request a purge verification code for immediate permanent deletion.
   * Sends a code to the owner's email.
   */
  async requestPurgeVerification(userId: string, projectId: string, callerKeyProjectId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (userId === 'api-key') {
      throw new ForbiddenException('An API key cannot purge a project');
    }
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can permanently delete');
    if (!project.deletedAt) throw new ForbiddenException('Project must be soft-deleted before permanent purge');

    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hashed code + expiry on the user record (or a separate table if preferred)
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationCode: hashedCode, verificationCodeExpiresAt: expiresAt },
    });

    // TODO: Send email with code via Stalwart/SMTP
    this.eventService.emit('projects.project.purge_verification_sent', projectId, {
      expiresAt,
    });

    return { success: true, expiresAt, message: `Verification code sent to your email` };
  }

  /**
   * Permanently delete a soft-deleted project after verifying the code.
   * Project must have been soft-deleted (deletedAt set).
   */
  async purge(userId: string, projectId: string, code: string, callerKeyProjectId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (userId === 'api-key') {
      throw new ForbiddenException('An API key cannot purge a project');
    }
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can permanently delete');
    if (!project.deletedAt) throw new ForbiddenException('Project must be soft-deleted first');

    // Verify the code
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.verificationCode || !user.verificationCodeExpiresAt) {
      throw new ForbiddenException('No verification code found — request one first');
    }
    if (new Date() > user.verificationCodeExpiresAt) {
      throw new ForbiddenException('Verification code expired — request a new one');
    }
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (hashedCode !== user.verificationCode) {
      throw new ForbiddenException('Invalid verification code');
    }

    // Clear the code
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationCode: null, verificationCodeExpiresAt: null },
    });

    // Hard delete — cascade handles members, deployments, etc.
    await this.prisma.project.delete({ where: { id: projectId } });
    // The slug rides the event: the teardown's image removal needs it,
    // and the row it lived in is gone by now.
    await this.eventService.emit('projects.project.purged', projectId, { slug: project.slug });

    return { success: true };
  }

  async suspend(userId: string, projectId: string, callerKeyProjectId?: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner'], callerKeyProjectId);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'SUSPENDED' },
    });
    await this.eventService.emit('projects.project.suspended', projectId, {});
    return this.format.formatProject(project);
  }

  async archive(userId: string, projectId: string, callerKeyProjectId?: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner'], callerKeyProjectId);
    const project = await this.prisma.project.update({
      where: { id: projectId }, data: { status: 'ARCHIVED' },
    });
    await this.eventService.emit('projects.project.archived', projectId, {});
    return this.format.formatProject(project);
  }

  async restore(userId: string, projectId: string, callerKeyProjectId?: string) {
    await this.access.checkPermission(userId, projectId, ['admin', 'owner'], callerKeyProjectId);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ACTIVE', deletedAt: null },
    });
    await this.eventService.emit('projects.project.restored', projectId, {});
    return this.format.formatProject(project);
  }

  async clone(userId: string, projectId: string, dto: any, callerKeyProjectId?: string) {
    return this.createService.clone(
      userId,
      projectId,
      dto,
      (id: string, target: string) => this.access.findProjectWithAccess(id, target, callerKeyProjectId),
    );
  }

  /**
   * Get the last N platform events for a project (activity feed).
   * Covers: project lifecycle, deployments, members, env vars, api keys.
   */
  async getProjectEvents(userId: string, projectId: string, limit = 20, callerKeyProjectId?: string) {
    // Verify access
    await this.access.findProjectWithAccess(userId, projectId, callerKeyProjectId);

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
