import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StalwartAccountService } from '@/modules/email/stalwart/stalwart-account.service';
import { MailboxCleanupService } from '@/modules/email/services/mailbox-cleanup.service';
import { CreateMailboxDto } from '@/modules/email/dto/create-mailbox.dto';
import { UpdateMailboxDto } from '@/modules/email/dto/update-mailbox.dto';
import { ResetMailboxPasswordDto } from '@/modules/email/dto/reset-mailbox-password.dto';
import * as crypto from 'crypto';

@Injectable()
export class EmailMailboxService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private stalwartAccount: StalwartAccountService,
    private cleanup: MailboxCleanupService,
  ) {}

  async createMailbox(projectId: string, dto: CreateMailboxDto) {
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

    await this.eventService.emit('email.mailbox_created', { mailboxId: mailbox.id, projectId, email: fullEmail });

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
}
