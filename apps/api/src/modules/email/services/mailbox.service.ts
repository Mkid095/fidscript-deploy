import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StalwartAccountService } from '@/modules/email/stalwart/stalwart-account.service';
import { MailboxCleanupService } from '@/modules/email/services/mailbox-cleanup.service';
import { CreateMailboxDto } from '@/modules/email/dto/create-mailbox.dto';
import { UpdateMailboxDto } from '@/modules/email/dto/update-mailbox.dto';
import { ResetMailboxPasswordDto } from '@/modules/email/dto/reset-mailbox-password.dto';
import { AddMailboxMemberDto, UpdateMailboxMemberDto } from '@/modules/email/dto/add-mailbox-member.dto';
import * as crypto from 'crypto';

/** All possible granular mailbox permissions. */
export const MAILBOX_PERMISSIONS = [
  'canReply',
  'canDelete',
  'canAssign',
  'canExport',
  'canManageMembers',
] as const;
export type MailboxPermission = typeof MAILBOX_PERMISSIONS[number];

/** Default permissions per role. */
export const ROLE_DEFAULTS: Record<string, string[]> = {
  OWNER:    ['canReply', 'canDelete', 'canAssign', 'canExport', 'canManageMembers'],
  MEMBER:   ['canReply', 'canExport'],
  ASSIGNEE: ['canReply'],
};

@Injectable()
export class EmailMailboxService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private stalwartAccount: StalwartAccountService,
    private cleanup: MailboxCleanupService,
  ) {}

  async createMailbox(projectId: string, dto: CreateMailboxDto, ownerUserId?: string) {
    const domain = await this.prisma.emailDomain.findFirst({ where: { projectId, domain: dto.domain } });
    if (!domain) throw new NotFoundException('Domain not found. Add the domain first.');
    if (domain.status !== 'ACTIVE') throw new BadRequestException(`Domain must be ACTIVE. Current: ${domain.status}`);

    const existing = await this.prisma.emailMailbox.findFirst({ where: { domainId: domain.id, localPart: dto.localPart } });
    if (existing) throw new BadRequestException('Mailbox already exists on this domain');

    const tempPassword = crypto.randomBytes(20).toString('base64').slice(0, 24);
    const fullEmail = `${dto.localPart}@${domain.domain}`;

    let stalwartAccountId: string | undefined;
    try {
      const account = await this.stalwartAccount.createAccount(fullEmail, tempPassword, dto.name, dto.quotaMb);
      stalwartAccountId = account.id;
    } catch { throw new InternalServerErrorException('Failed to create mailbox on mail server'); }

    const mailbox = await this.prisma.emailMailbox.create({
      data: {
        domainId: domain.id, localPart: dto.localPart, name: dto.name,
        quota: BigInt(dto.quotaMb ?? 1024) * BigInt(1024 * 1024), stalwartAccountId,
      },
    });

    // Auto-add creator as OWNER member
    if (ownerUserId) {
      await this.prisma.emailMailboxMember.create({
        data: {
          mailboxId: mailbox.id,
          userId: ownerUserId,
          role: 'OWNER',
          permissions: ROLE_DEFAULTS['OWNER'] as object,
        },
      });
    }

    await this.eventService.emit('email.mailbox_created', projectId, { mailboxId: mailbox.id, email: fullEmail }, {});

    const host = this.configService.get('PLATFORM_MAIL_HOST', 'mail.deploy.fidscript.com');
    return {
      id: mailbox.id, email: fullEmail, name: dto.name, quotaMb: dto.quotaMb ?? 1024,
      imapHost: host, imapPort: 993, smtpHost: host, smtpPort: 587,
      username: fullEmail, password: tempPassword,
      message: 'This password is temporary. Change it after setup via IMAP settings.',
    };
  }

  async updateMailbox(projectId: string, mailboxId: string, dto: UpdateMailboxDto) {
    const mailbox = await this.getMailbox(projectId, mailboxId);
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.quotaMb !== undefined) updateData.quota = BigInt(dto.quotaMb) * BigInt(1024 * 1024);
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
      if (mailbox.stalwartAccountId) await this.stalwartAccount.setAccountStatus(mailbox.stalwartAccountId, dto.isActive);
    }
    return this.prisma.emailMailbox.update({ where: { id: mailboxId }, data: updateData });
  }

  async resetMailboxPassword(projectId: string, mailboxId: string, _dto: ResetMailboxPasswordDto) {
    const mailbox = await this.getMailbox(projectId, mailboxId);
    if (!mailbox.stalwartAccountId) throw new InternalServerErrorException('Mailbox has no Stalwart account');
    const newPassword = crypto.randomBytes(20).toString('base64').slice(0, 24);
    await this.stalwartAccount.setAccountPassword(mailbox.stalwartAccountId, newPassword);
    return { success: true, email: `${mailbox.localPart}@${mailbox.domain.domain}`, password: newPassword, message: 'Password updated. Use the new password for IMAP/SMTP.' };
  }

  deleteMailbox(projectId: string, mailboxId: string) { return this.cleanup.deleteMailbox(projectId, mailboxId); }
  suspendMailbox(projectId: string, mailboxId: string) { return this.updateMailbox(projectId, mailboxId, { isActive: false }); }
  activateMailbox(projectId: string, mailboxId: string) { return this.updateMailbox(projectId, mailboxId, { isActive: true }); }

  async getMailbox(projectId: string, mailboxId: string) {
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { id: mailboxId },
      include: { domain: { select: { domain: true, projectId: true } } },
    });
    if (!mailbox || mailbox.domain.projectId !== projectId) throw new NotFoundException('Mailbox not found');
    return mailbox;
  }

  async listMailboxes(projectId: string, domainId?: string) {
    const domains = domainId
      ? [await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } })]
      : await this.prisma.emailDomain.findMany({ where: { projectId } });
    const domainIds = domains.filter(Boolean).map((d) => d!.id);
    return this.prisma.emailMailbox.findMany({ where: { domainId: { in: domainIds } }, orderBy: { createdAt: 'desc' } });
  }

  // ─── Member Management ────────────────────────────────────────────────────────

  async addMember(mailboxId: string, projectId: string, dto: AddMailboxMemberDto) {
    const mailbox = await this.getMailbox(projectId, mailboxId);
    if (!dto.userId && !dto.apiKeyId) {
      throw new BadRequestException('Either userId or apiKeyId must be provided');
    }

    // Validate uniqueness
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

    await this.eventService.emit('email.mailbox.member_added', mailbox.domain.projectId, {
      mailboxId,
      memberId: member.id,
      userId: dto.userId,
      apiKeyId: dto.apiKeyId,
      role,
    }, {});

    return member;
  }

  async listMembers(mailboxId: string, projectId: string) {
    await this.getMailbox(projectId, mailboxId);
    return this.prisma.emailMailboxMember.findMany({
      where: { mailboxId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { addedAt: 'asc' },
    });
  }

  async updateMember(mailboxId: string, projectId: string, memberId: string, dto: UpdateMailboxMemberDto) {
    await this.getMailbox(projectId, mailboxId);
    const member = await this.prisma.emailMailboxMember.findFirst({ where: { id: memberId, mailboxId } });
    if (!member) throw new NotFoundException('Member not found');

    const newRole = dto.role ?? member.role;
    const newPermissions = dto.permissions ?? member.permissions as string[];

    const updated = await this.prisma.emailMailboxMember.update({
      where: { id: memberId },
      data: { role: newRole, permissions: newPermissions as object },
    });

    await this.eventService.emit('email.mailbox.member_updated', projectId, {
      mailboxId,
      memberId,
      role: newRole,
    }, {});

    return updated;
  }

  async removeMember(mailboxId: string, projectId: string, memberId: string) {
    await this.getMailbox(projectId, mailboxId);
    const member = await this.prisma.emailMailboxMember.findFirst({ where: { id: memberId, mailboxId } });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.emailMailboxMember.delete({ where: { id: memberId } });

    await this.eventService.emit('email.mailbox.member_removed', projectId, {
      mailboxId,
      memberId,
      userId: member.userId,
      apiKeyId: member.apiKeyId,
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
      where: {
        mailboxId,
        OR: [
          { userId: userId ?? '' },
          { apiKeyId: apiKeyId ?? '' },
        ],
      },
    });
    if (!member) return false;
    if (member.role === 'OWNER') return true;
    const perms = member.permissions as string[];
    return perms.includes(permission);
  }
}
