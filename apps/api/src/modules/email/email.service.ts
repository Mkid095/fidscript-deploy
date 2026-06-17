import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { EmailProvider, SendEmailOptions, EMAIL_PROVIDER } from './providers/index';
import {
  SendEmailDto,
  CreateMailboxDto,
  CreateAliasDto,
  VerifyDomainDto,
  GetEmailsDto,
} from './dto/index';

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    @Inject(EMAIL_PROVIDER) private emailProvider: EmailProvider,
  ) {}

  async sendEmail(projectId: string, dto: SendEmailDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const result = await this.emailProvider.send({
      to: dto.to,
      from: dto.from,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      replyTo: dto.replyTo,
      attachments: dto.attachments,
    });

    const emailLog = await this.prisma.emailLog.create({
      data: {
        projectId,
        messageId: result.messageId,
        from: dto.from || this.configService.get('SMTP_FROM', 'noreply@localhost'),
        to: dto.to,
        subject: dto.subject,
        status: 'SENT',
      },
    });

    await this.eventService.emit('email.sent', {
      emailLogId: emailLog.id,
      projectId,
      messageId: result.messageId,
      to: dto.to,
    });

    return { emailLogId: emailLog.id, messageId: result.messageId, accepted: result.accepted };
  }

  async createMailbox(projectId: string, dto: CreateMailboxDto) {
    const existing = await this.prisma.mailbox.findFirst({
      where: { projectId, email: dto.email },
    });
    if (existing) throw new Error('Mailbox already exists');

    const mailbox = await this.prisma.mailbox.create({
      data: {
        projectId,
        email: dto.email,
        name: dto.name,
        quota: dto.quota || 10737418240,
      },
    });

    await this.eventService.emit('email.mailbox_created', {
      mailboxId: mailbox.id,
      projectId,
      email: dto.email,
    });

    return mailbox;
  }

  async listMailboxes(projectId: string) {
    return this.prisma.mailbox.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMailbox(projectId: string, mailboxId: string) {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id: mailboxId, projectId },
    });
    if (!mailbox) throw new NotFoundException('Mailbox not found');

    await this.prisma.mailbox.delete({ where: { id: mailboxId } });
    return { deleted: true };
  }

  async createAlias(projectId: string, dto: CreateAliasDto) {
    const alias = await this.prisma.emailAlias.create({
      data: {
        projectId,
        alias: dto.alias,
        forwardsTo: dto.forwardsTo,
        description: dto.description,
      },
    });

    return alias;
  }

  async listAliases(projectId: string) {
    return this.prisma.emailAlias.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAlias(projectId: string, aliasId: string) {
    const alias = await this.prisma.emailAlias.findFirst({
      where: { id: aliasId, projectId },
    });
    if (!alias) throw new NotFoundException('Alias not found');

    await this.prisma.emailAlias.delete({ where: { id: aliasId } });
    return { deleted: true };
  }

  async verifyDomain(projectId: string, dto: VerifyDomainDto) {
    const result = await this.emailProvider.verifyDomain?.(dto.domain);
    if (!result) throw new Error('Domain verification not supported by provider');

    const domainVerification = await this.prisma.domainVerification.upsert({
      where: { projectId_domain: { projectId, domain: dto.domain } },
      create: {
        projectId,
        domain: dto.domain,
        dkimVerified: result.dkim,
        spfVerified: result.spf,
        dmarcVerified: result.dmarc,
      },
      update: {
        dkimVerified: result.dkim,
        spfVerified: result.spf,
        dmarcVerified: result.dmarc,
      },
    });

    await this.eventService.emit('email.domain_added', {
      projectId,
      domain: dto.domain,
      dkim: result.dkim,
      spf: result.spf,
      dmarc: result.dmarc,
    });

    return domainVerification;
  }

  async getDomainVerification(projectId: string, domain: string) {
    return this.prisma.domainVerification.findUnique({
      where: { projectId_domain: { projectId, domain } },
    });
  }

  async listEmailLogs(projectId: string, dto: GetEmailsDto) {
    return this.prisma.emailLog.findMany({
      where: {
        projectId,
        ...(dto.mailboxId && { mailboxId: dto.mailboxId }),
        ...(dto.unread !== undefined && { readAt: dto.unread ? null : { not: null } }),
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit || 50,
      skip: dto.offset || 0,
    });
  }

  async getDeliveryStatus(messageId: string) {
    return this.emailProvider.getDeliveryStatus?.(messageId) || { status: 'unknown' };
  }
}