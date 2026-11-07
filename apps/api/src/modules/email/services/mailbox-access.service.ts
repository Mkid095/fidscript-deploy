/**
 * Mailbox access control — member management and permission checks.
 *
 * Roles: OWNER (all perms), MEMBER (default), ASSIGNEE (reply only).
 * Permissions: canReply, canDelete, canAssign, canExport, canManageMembers.
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { MailboxCrudService } from './mailbox-crud.service';
import { AddMailboxMemberDto, UpdateMailboxMemberDto } from '@/modules/email/dto/add-mailbox-member.dto';

export const MAILBOX_PERMISSIONS = [
  'canReply', 'canDelete', 'canAssign', 'canExport', 'canManageMembers',
] as const;
export type MailboxPermission = typeof MAILBOX_PERMISSIONS[number];

export const ROLE_DEFAULTS: Record<string, string[]> = {
  OWNER:    ['canReply', 'canDelete', 'canAssign', 'canExport', 'canManageMembers'],
  MEMBER:   ['canReply', 'canExport'],
  ASSIGNEE: ['canReply'],
};

@Injectable()
export class MailboxAccessService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private mailboxCrud: MailboxCrudService,
  ) {}

  async addMember(mailboxId: string, projectId: string, dto: AddMailboxMemberDto) {
    await this.mailboxCrud.getMailbox(projectId, mailboxId);
    if (!dto.userId && !dto.apiKeyId) {
      throw new BadRequestException('Either userId or apiKeyId must be provided');
    }

    if (dto.userId) {
      const existing = await this.prisma.emailMailboxMember.findUnique({
        where: { mailboxId_userId: { mailboxId, userId: dto.userId } },
      });
      if (existing) throw new BadRequestException('User is already a member of this mailbox');
    }
    if (dto.apiKeyId) {
      const existing = await this.prisma.emailMailboxMember.findUnique({
        where: { mailboxId_apiKeyId: { mailboxId, apiKeyId: dto.apiKeyId } },
      });
      if (existing) throw new BadRequestException('API key is already a member of this mailbox');
    }

    const role = dto.role ?? 'MEMBER';
    const permissions = dto.permissions
      ? [...new Set([...(ROLE_DEFAULTS[role] ?? []), ...dto.permissions])]
      : ROLE_DEFAULTS[role];

    const member = await this.prisma.emailMailboxMember.create({
      data: {
        mailboxId,
        userId: dto.userId,
        apiKeyId: dto.apiKeyId,
        role,
        permissions: permissions as object,
      },
    });

    const mailbox = await this.mailboxCrud.getMailbox(projectId, mailboxId);
    await this.eventService.emit('email.mailbox.member_added', mailbox.domain.projectId, {
      mailboxId, memberId: member.id, userId: dto.userId, apiKeyId: dto.apiKeyId, role,
    }, {});

    return member;
  }

  async listMembers(mailboxId: string, projectId: string) {
    await this.mailboxCrud.getMailbox(projectId, mailboxId);
    return this.prisma.emailMailboxMember.findMany({
      where: { mailboxId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { addedAt: 'asc' },
    });
  }

  async updateMember(mailboxId: string, projectId: string, memberId: string, dto: UpdateMailboxMemberDto) {
    await this.mailboxCrud.getMailbox(projectId, mailboxId);
    const member = await this.prisma.emailMailboxMember.findFirst({ where: { id: memberId, mailboxId } });
    if (!member) throw new NotFoundException('Member not found');

    const newRole = dto.role ?? member.role;
    const newPermissions = dto.permissions ?? (member.permissions as string[]);
    const updated = await this.prisma.emailMailboxMember.update({
      where: { id: memberId },
      data: { role: newRole, permissions: newPermissions as object },
    });

    const mailbox = await this.mailboxCrud.getMailbox(projectId, mailboxId);
    await this.eventService.emit('email.mailbox.member_updated', mailbox.domain.projectId, {
      mailboxId, memberId, role: newRole,
    }, {});

    return updated;
  }

  async removeMember(mailboxId: string, projectId: string, memberId: string) {
    await this.mailboxCrud.getMailbox(projectId, mailboxId);
    const member = await this.prisma.emailMailboxMember.findFirst({ where: { id: memberId, mailboxId } });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.emailMailboxMember.delete({ where: { id: memberId } });

    const mailbox = await this.mailboxCrud.getMailbox(projectId, mailboxId);
    await this.eventService.emit('email.mailbox.member_removed', mailbox.domain.projectId, {
      mailboxId, memberId, userId: member.userId, apiKeyId: member.apiKeyId,
    }, {});

    return { deleted: true };
  }

  /**
   * Check if a user or API key has a specific permission on a mailbox.
   * OWNER always passes. MEMBER/ASSIGNEE only pass if they have the permission.
   */
  async hasPermission(
    mailboxId: string,
    userId: string | undefined,
    apiKeyId: string | undefined,
    permission: MailboxPermission,
  ): Promise<boolean> {
    const member = await this.prisma.emailMailboxMember.findFirst({
      where: { mailboxId, OR: [{ userId: userId ?? '' }, { apiKeyId: apiKeyId ?? '' }] },
    });
    if (!member) return false;
    if (member.role === 'OWNER') return true;
    const perms = member.permissions as string[];
    return perms.includes(permission);
  }
}
