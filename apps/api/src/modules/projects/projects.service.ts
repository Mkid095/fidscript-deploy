import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { CryptoService } from '../crypto/crypto.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CloneProjectDto,
  AddMemberDto,
  UpdateEnvVarsDto,
  CreateInvitationDto,
  AcceptInvitationDto,
} from './dto/index';

const BCRYPT_ROUNDS = 12;
const INVITATION_TOKEN_BYTES = 32;
const INVITATION_EXPIRY_DAYS = 7;
const PROJECT_API_KEY_BYTES = 24;

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
    private configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Projects
  // ─────────────────────────────────────────────────────────────

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

    await this.eventService.emit('projects.project.created', {
      id: crypto.randomUUID(),
      type: 'projects.project.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { name: project.name, slug: project.slug },
    });

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
        ...(dto.buildSettings && { buildSettings: dto.buildSettings }),
      },
    });

    await this.eventService.emit('projects.project.updated', {
      id: crypto.randomUUID(),
      type: 'projects.project.updated',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: dto,
    });

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

    await this.eventService.emit('projects.project.deleted', {
      id: crypto.randomUUID(),
      type: 'projects.project.deleted',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: {},
    });

    return { success: true };
  }

  async suspend(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'SUSPENDED' },
    });

    await this.eventService.emit('projects.project.suspended', {
      id: crypto.randomUUID(),
      type: 'projects.project.suspended',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: {},
    });

    return this.formatProject(project);
  }

  async archive(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED' },
    });

    await this.eventService.emit('projects.project.archived', {
      id: crypto.randomUUID(),
      type: 'projects.project.archived',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: {},
    });

    return this.formatProject(project);
  }

  async restore(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ACTIVE' },
    });

    await this.eventService.emit('projects.project.restored', {
      id: crypto.randomUUID(),
      type: 'projects.project.restored',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: {},
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
        name: dto.name,
        slug,
        description: source.description,
        type: source.type,
        ownerId: userId,
        region: source.region,
        buildSettings: source.buildSettings as any,
        deploymentStrategy: source.deploymentStrategy,
        sourceProvider: source.sourceProvider,
        sourceRepo: source.sourceRepo,
        sourceBranch: source.sourceBranch,
      },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    // Clone encrypted env vars
    const envVars = await this.prisma.projectEnv.findMany({ where: { projectId } });
    for (const envVar of envVars) {
      await this.prisma.projectEnv.create({
        data: { projectId: project.id, key: envVar.key, value: envVar.value },
      });
    }

    await this.eventService.emit('projects.project.cloned', {
      id: crypto.randomUUID(),
      type: 'projects.project.cloned',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { sourceProjectId: projectId },
    });

    return this.formatProject(project);
  }

  // ─────────────────────────────────────────────────────────────
  // Members
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // Encrypted Environment Variables
  // ─────────────────────────────────────────────────────────────

  async getEnvVars(userId: string, projectId: string) {
    await this.findProjectWithAccess(userId, projectId);

    const rows = await this.prisma.projectEnv.findMany({
      where: { projectId },
      orderBy: { key: 'asc' },
    });

    const envVars = rows.map(row => {
      let value = '[encrypted]';
      try {
        value = this.cryptoService.decrypt(row.value);
      } catch {
        value = '[decrypt error]';
      }
      return { key: row.key, value };
    });

    return { envVars };
  }

  async updateEnvVars(userId: string, projectId: string, dto: UpdateEnvVarsDto) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    for (const item of dto.envVars) {
      const encrypted = this.cryptoService.encrypt(item.value);
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: item.key } },
        create: { projectId, key: item.key, value: encrypted },
        update: { value: encrypted },
      });
    }

    await this.eventService.emit('projects.env_var.updated', {
      id: crypto.randomUUID(),
      type: 'projects.env_var.updated',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { keys: dto.envVars.map(e => e.key) },
    });

    return { success: true };
  }

  async deleteEnvVar(userId: string, projectId: string, key: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    await this.prisma.projectEnv.deleteMany({
      where: { projectId, key },
    });

    await this.eventService.emit('projects.env_var.deleted', {
      id: crypto.randomUUID(),
      type: 'projects.env_var.deleted',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project',
      resourceId: projectId,
      metadata: { key },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Invitations
  // ─────────────────────────────────────────────────────────────

  async createInvitation(userId: string, projectId: string, dto: CreateInvitationDto) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } },
      });
      if (alreadyMember) throw new ConflictException('User is already a member');
    }

    // Check for existing pending invitation
    const existingInvite = await this.prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email: dto.email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) throw new ConflictException('Invitation already pending for this email');

    const token = crypto.randomBytes(INVITATION_TOKEN_BYTES).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.projectInvitation.create({
      data: {
        projectId,
        email: dto.email,
        role: dto.role,
        tokenHash,
        expiresAt,
        invitedBy: userId,
      },
    });

    await this.eventService.emit('projects.invitation.created', {
      id: crypto.randomUUID(),
      type: 'projects.invitation.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_invitation',
      resourceId: invitation.id,
      metadata: { projectId, email: dto.email, role: dto.role },
    });

    // Return the raw token (shown only once, user must share via email)
    return { invitationId: invitation.id, token, expiresAt };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.projectInvitation.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const user = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (!user) throw new BadRequestException('No account found for this invitation email');

    // Create membership
    await this.prisma.projectMember.create({
      data: { projectId: invitation.projectId, userId: user.id, role: invitation.role },
    });

    // Mark invitation accepted
    await this.prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await this.eventService.emit('projects.invitation.accepted', {
      id: crypto.randomUUID(),
      type: 'projects.invitation.accepted',
      timestamp: new Date(),
      actorId: user.id,
      actorType: 'user',
      resourceType: 'project_invitation',
      resourceId: invitation.id,
      metadata: { projectId: invitation.projectId, email: invitation.email },
    });

    return { success: true, projectId: invitation.projectId };
  }

  async listInvitations(userId: string, projectId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const invitations = await this.prisma.projectInvitation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return { invitations };
  }

  async revokeInvitation(userId: string, projectId: string, invitationId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { id: invitationId, projectId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    await this.prisma.projectInvitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });

    await this.eventService.emit('projects.invitation.revoked', {
      id: crypto.randomUUID(),
      type: 'projects.invitation.revoked',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_invitation',
      resourceId: invitationId,
      metadata: { projectId },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Project API Keys
  // ─────────────────────────────────────────────────────────────

  async createProjectApiKey(
    userId: string,
    projectId: string,
    dto: { name: string; permissions?: string[]; expiresAt?: string },
  ) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const key = `fpk_${crypto.randomBytes(PROJECT_API_KEY_BYTES).toString('base64url')}`;
    const keyHash = await bcrypt.hash(key, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.projectApiKey.create({
      data: {
        projectId,
        name: dto.name,
        keyHash,
        permissions: dto.permissions || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.eventService.emit('projects.api_key.created', {
      id: crypto.randomUUID(),
      type: 'projects.api_key.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_api_key',
      resourceId: apiKey.id,
      metadata: { projectId, name: dto.name },
    });

    return { apiKey, key };
  }

  async listProjectApiKeys(userId: string, projectId: string) {
    await this.findProjectWithAccess(userId, projectId);

    const keys = await this.prisma.projectApiKey.findMany({
      where: { projectId },
      select: { id: true, name: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return { apiKeys: keys };
  }

  async revokeProjectApiKey(userId: string, projectId: string, keyId: string) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const apiKey = await this.prisma.projectApiKey.findFirst({
      where: { id: keyId, projectId },
    });
    if (!apiKey) throw new NotFoundException('API key not found');

    await this.prisma.projectApiKey.delete({ where: { id: keyId } });

    await this.eventService.emit('projects.api_key.revoked', {
      id: crypto.randomUUID(),
      type: 'projects.api_key.revoked',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'project_api_key',
      resourceId: keyId,
      metadata: { projectId, name: apiKey.name },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

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
      type: project.type?.toLowerCase(),
      status: project.status?.toLowerCase(),
      ownerId: project.ownerId,
      owner: project.owner,
      region: project.region,
      subdomain: project.subdomain,
      customDomains: project.customDomains || [],
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