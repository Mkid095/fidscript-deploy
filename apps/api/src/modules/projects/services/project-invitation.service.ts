import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateInvitationDto, AcceptInvitationDto } from '@/modules/projects/dto/invitation.dto';
import * as crypto from 'crypto';

const INVITATION_TOKEN_BYTES = 32;
const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class ProjectInvitationService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createInvitation(userId: string, projectId: string, dto: CreateInvitationDto) {
    await this.checkPermission(userId, projectId, ['admin', 'owner']);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } },
      });
      if (alreadyMember) throw new ConflictException('User is already a member');
    }

    const existingInvite = await this.prisma.projectInvitation.findFirst({
      where: {
        projectId, email: dto.email, acceptedAt: null, revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) throw new ConflictException('Invitation already pending for this email');

    const token = crypto.randomBytes(INVITATION_TOKEN_BYTES).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.projectInvitation.create({
      data: { projectId, email: dto.email, role: dto.role, tokenHash, expiresAt, invitedBy: userId },
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

    return { invitationId: invitation.id, token, expiresAt };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.projectInvitation.findFirst({
      where: { tokenHash, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invitation) throw new BadRequestException('Invalid or expired invitation');

    const user = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (!user) throw new BadRequestException('No account found for this invitation email');

    await this.prisma.projectMember.create({
      data: { projectId: invitation.projectId, userId: user.id, role: invitation.role },
    });

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
