import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import * as crypto from 'crypto';

// Default permissions per role
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'],
  ADMIN: ['domains.*', 'email.*', 'storage.*', 'notifications.*', 'org.members.manage', 'org.teams.manage', 'org.settings'],
  DEVELOPER: ['domains.read', 'domains.write', 'email.*', 'storage.*', 'notifications.*'],
  BILLING: ['billing.*', 'org.members.read'],
  VIEWER: ['domains.read', 'email.read', 'storage.read', 'notifications.read'],
};

const INVITATION_TTL_HOURS = 72;

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private mail: PlatformMailService,
  ) {}

  // ─── Organization CRUD ───────────────────────────────────────────────────────

  async createOrganization(userId: string, dto: { name: string; slug: string }, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already taken');

    // Create org with OWNER role pre-seeded
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        roles: {
          create: {
            name: 'OWNER',
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['OWNER']),
          },
        },
      },
      include: { roles: true },
    });

    const ownerRole = org.roles.find(r => r.name === 'OWNER')!;

    // Add creator as OWNER member
    await this.prisma.organizationMember.create({
      data: { organizationId: org.id, userId, roleId: ownerRole.id },
    });

    await this.eventService.emit('identity.organization.created', null, { name: org.name, slug: org.slug }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: org.id,
      ipAddress,
      userAgent,
    });

    return org;
  }

  async getOrganization(userId: string, orgId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: {
        organization: { include: { roles: true } },
        role: true,
      },
    });
    if (!member) throw new NotFoundException('Organization not found');
    return member;
  }

  async listOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: { include: { roles: true } },
        role: { select: { name: true, permissions: true } },
      },
    });
    return memberships.map(m => ({
      ...m.organization,
      myRole: m.role.name,
      myPermissions: m.role.permissions as string[],
    }));
  }

  async updateOrganization(userId: string, orgId: string, dto: { name?: string; logoUrl?: string }, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.settings') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { name: dto.name, logoUrl: dto.logoUrl },
    });

    await this.eventService.emit('identity.organization.updated', null, { name: org.name }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: org.id,
      ipAddress,
      userAgent,
    });

    return org;
  }

  async deleteOrganization(userId: string, orgId: string, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (member.role.name !== 'OWNER') throw new ForbiddenException('Only OWNER can delete organization');

    await this.prisma.organization.delete({ where: { id: orgId } });

    await this.eventService.emit('identity.organization.deleted', null, { orgId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: orgId,
      ipAddress,
      userAgent,
    });

    return { deleted: true };
  }

  // ─── Role Management ─────────────────────────────────────────────────────────

  async createRole(userId: string, orgId: string, dto: { name: string; permissions: string[] }, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.roles.manage') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const role = await this.prisma.orgRole.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        permissions: JSON.stringify(dto.permissions),
      },
    });

    return role;
  }

  async listRoles(userId: string, orgId: string) {
    await this.prisma.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    const roles = await this.prisma.orgRole.findMany({
      where: { organizationId: orgId },
    });
    return roles.map(r => ({ ...r, permissions: JSON.parse(r.permissions as string) }));
  }

  async updateRole(userId: string, orgId: string, roleId: string, dto: { name?: string; permissions?: string[] }, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.roles.manage') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const role = await this.prisma.orgRole.update({
      where: { id: roleId },
      data: {
        name: dto.name,
        permissions: dto.permissions ? JSON.stringify(dto.permissions) : undefined,
      },
    });

    return { ...role, permissions: JSON.parse(role.permissions as string) };
  }

  // ─── Member Management ────────────────────────────────────────────────────────

  async listMembers(userId: string, orgId: string) {
    await this.prisma.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        role: true,
      },
    });
  }

  async removeMember(userId: string, orgId: string, targetUserId: string, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.members.manage') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      include: { role: true },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role.name === 'OWNER') throw new ForbiddenException('Cannot remove OWNER');

    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });

    await this.eventService.emit('identity.organization.member_removed', null, { removedUserId: targetUserId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: orgId,
      ipAddress,
      userAgent,
    });

    return { removed: true };
  }

  async updateMemberRole(userId: string, orgId: string, targetUserId: string, roleId: string, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.members.manage') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const updated = await this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { roleId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: true,
      },
    });

    await this.eventService.emit('identity.organization.member_role_changed', null, { targetUserId, newRoleId: roleId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: orgId,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  // ─── Invitation Lifecycle ────────────────────────────────────────────────────

  async inviteMember(userId: string, orgId: string, dto: { email: string; roleName: string }, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.members.manage') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Find the role by name within this org
    const role = await this.prisma.orgRole.findUnique({
      where: { organizationId_name: { organizationId: orgId, name: dto.roleName } },
    });
    if (!role) throw new NotFoundException(`Role '${dto.roleName}' not found in this organization`);

    // Check if already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) {
      const existing = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: existingUser.id } },
      });
      if (existing) throw new ConflictException('User is already a member');
    }

    // Invalidate any existing pending invitations for this email
    await this.prisma.invitation.updateMany({
      where: { organizationId: orgId, email: dto.email.toLowerCase(), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: dto.email.toLowerCase(),
        roleId: role.id,
        token,
        invitedBy: userId,
        expiresAt,
      },
    });

    // Send invitation email
    const baseUrl = process.env['APP_URL'] ?? 'https://app.fidscript.com';
    const acceptUrl = `${baseUrl}/auth/invitation/accept?token=${token}`;

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    await this.mail.send({
      to: dto.email,
      subject: `You've been invited to join ${org!.name}`,
      text: `You've been invited to join ${org!.name} as ${dto.roleName}.\n\nClick to accept: ${acceptUrl}\n\nThis link expires in ${INVITATION_TTL_HOURS} hours.`,
      html: this.buildInvitationHtml({ orgName: org!.name, roleName: dto.roleName, acceptUrl, hours: INVITATION_TTL_HOURS }),
    });

    await this.eventService.emit('identity.organization.member_invited', null, { email: dto.email, roleName: dto.roleName }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: orgId,
      ipAddress,
      userAgent,
    });

    return { id: invitation.id, email: dto.email, expiresAt };
  }

  async acceptInvitation(token: string, ipAddress?: string, userAgent?: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.revokedAt) throw new BadRequestException('Invitation has been revoked');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');
    if (invitation.acceptedAt) throw new BadRequestException('Invitation already accepted');

    const user = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (!user) throw new NotFoundException('No account found for this invitation email. Please register first.');

    // Add user as member
    await this.prisma.organizationMember.create({
      data: { organizationId: invitation.organizationId, userId: user.id, roleId: invitation.roleId, invitedBy: invitation.invitedBy },
    });

    // Mark invitation accepted
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedBy: user.id },
    });

    await this.eventService.emit('identity.organization.member_joined', null, { userId: user.id, email: invitation.email }, {
      actorId: user.id,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: invitation.organizationId,
      ipAddress,
      userAgent,
    });

    return { success: true, organizationId: invitation.organizationId };
  }

  async listInvitations(userId: string, orgId: string) {
    await this.prisma.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    return this.prisma.invitation.findMany({
      where: { organizationId: orgId, acceptedAt: null, revokedAt: null },
      include: { role: { select: { name: true } } },
    });
  }

  async revokeInvitation(userId: string, orgId: string, invitationId: string, ipAddress?: string, userAgent?: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Organization not found');
    if (!this.hasPermission(member.role.permissions as string[], 'org.members.manage') && member.role.name !== 'OWNER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });

    await this.eventService.emit('identity.organization.invitation_revoked', null, { invitationId }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: orgId,
      ipAddress,
      userAgent,
    });

    return { revoked: true };
  }

  // ─── Permission helper ────────────────────────────────────────────────────────

  hasPermission(userPermissions: string[], required: string): boolean {
    if (userPermissions.includes('*')) return true;
    // Wildcard match: "email.*" matches "email.send"
    const parts = required.split('.');
    for (const p of userPermissions) {
      if (p === required) return true;
      if (p.endsWith('.*')) {
        const prefix = p.slice(0, -1);
        if (required.startsWith(prefix)) return true;
      }
    }
    return false;
  }

  // ─── HTML builder ────────────────────────────────────────────────────────────

  private buildInvitationHtml(opts: { orgName: string; roleName: string; acceptUrl: string; hours: number }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Organization Invitation</title></head>
<body style="margin:0;padding:0;background:#080a0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f1117;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0f1117;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1e2130;">
          <img src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png" alt="FIDScript" width="56" height="56" style="display:block;margin:0 auto 8px;border-radius:8px;" />
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;color:#f97316;text-transform:uppercase;">fidscript deploy</p>
        </td></tr>
        <tr><td style="background:#0f1117;padding:36px 40px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#e2e8f0;">You've been invited</p>
          <p style="margin:0 0 28px;font-size:14px;color:#64748b;">You've been invited to join <strong style="color:#e2e8f0;">${opts.orgName}</strong> as <strong style="color:#f97316;">${opts.roleName}</strong>.</p>
          <a href="${opts.acceptUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Accept Invitation</a>
          <p style="margin:0;font-size:12px;color:#475569;">Or copy and paste: <a href="${opts.acceptUrl}" style="color:#64748b;word-break:break-all;">${opts.acceptUrl}</a></p>
          <p style="margin:20px 0 0;font-size:12px;color:#475569;">This link expires in <strong style="color:#94a3b8;">${opts.hours} hours</strong>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
