import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { MailDnsService } from './mail-dns.service';
import { StalwartJmapService } from './stalwart-jmap.service';
import { WebhookService } from './webhook.service';
import { SendEmailDto } from './dto/send-email.dto';
import {
  CreateEmailDomainDto,
  CreateMailboxDto,
  UpdateMailboxDto,
  ResetMailboxPasswordDto,
  CreateAliasDto,
  UpdateAliasDto,
  CreateSenderIdentityDto,
  CreateEmailApiKeyDto,
  ListMessagesDto,
  MarkMessagesReadDto,
  DeleteMessagesDto,
} from './dto/index';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private mailDnsService: MailDnsService,
    private stalwartJmap: StalwartJmapService,
    private webhookService: WebhookService,
  ) {}

  // ================================================================
  // DOMAINS
  // ================================================================

  async createDomain(projectId: string, dto: CreateEmailDomainDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (existing) throw new BadRequestException('Domain already registered');

    // Generate ownership verification token
    const ownershipToken = crypto.randomBytes(16).toString('hex');

    const domain = await this.prisma.emailDomain.create({
      data: {
        projectId,
        domain: dto.domain,
        status: 'PENDING',
        ownershipToken,
      },
    });

    await this.eventService.emit('email.domain_added', {
      domainId: domain.id,
      projectId,
      domain: dto.domain,
    });

    return {
      domain,
      ownershipToken, // User must add this as a TXT record to prove ownership
      steps: [
        `1. Add TXT record: ${ownershipToken}._email.${dto.domain}`,
        `2. Add MX record: mail.${dto.domain} → 10 mail.${dto.domain}`,
        `3. Then call POST .../verify — ownership will be confirmed and DNS records created`,
      ],
    };
  }

  async verifyDomain(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    // Step 1: Verify ownership via TXT record → VERIFIED
    if (domain.status === 'PENDING') {
      const ownershipVerified = await this.mailDnsService.verifyOwnership(
        domain.domain,
        domain.ownershipToken!,
      );
      if (!ownershipVerified) {
        throw new BadRequestException(
          'Ownership not verified. Add the TXT record: ' +
          `${domain.ownershipToken}._email.${domain.domain}`,
        );
      }
      // Configure DNS records and move to VERIFIED in one step
      await this.mailDnsService.setupEmailDns(domain.domain);
      await this.prisma.emailDomain.update({
        where: { id: domainId },
        data: { status: 'VERIFIED', ownershipToken: null },
      });
      await this.eventService.emit('email.domain_verified', {
        domainId,
        projectId,
        domain: domain.domain,
        step: 'ownership',
      });
    }

    // Step 2: Full DNS verification (DKIM/SPF/DMARC/MX) → ACTIVE
    if (domain.status === 'VERIFIED') {
      const result = await this.mailDnsService.verifyEmailDns(domain.domain);
      const allVerified = result.dkim && result.spf && result.dmarc && result.mx;

      if (allVerified) {
        await this.prisma.emailDomain.update({
          where: { id: domainId },
          data: {
            dkimVerified: true,
            spfVerified: true,
            dmarcVerified: true,
            mxVerified: true,
            status: 'ACTIVE',
            verifiedAt: new Date(),
          },
        });
      } else {
        // Keep VERIFIED — DNS is configured but not fully propagated/validated yet
        await this.prisma.emailDomain.update({
          where: { id: domainId },
          data: {
            dkimVerified: result.dkim,
            spfVerified: result.spf,
            dmarcVerified: result.dmarc,
            mxVerified: result.mx,
          },
        });
      }

      await this.eventService.emit('email.domain_verified', {
        domainId,
        projectId,
        domain: domain.domain,
        ...result,
      });
    }

    return this.prisma.emailDomain.findUnique({ where: { id: domainId } });
  }

  async listDomains(projectId: string) {
    return this.prisma.emailDomain.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDomain(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  async deleteDomain(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
      include: { mailboxes: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    for (const mailbox of domain.mailboxes) {
      if (mailbox.stalwartAccountId) {
        try {
          await this.stalwartJmap.deleteAccount(mailbox.stalwartAccountId);
        } catch (err) {
          this.logger.warn(`Failed to delete Stalwart account: ${err}`);
        }
      }
    }

    await this.prisma.emailDomain.delete({ where: { id: domainId } });

    await this.eventService.emit('email.domain_deleted', {
      domainId,
      projectId,
      domain: domain.domain,
    });

    return { deleted: true };
  }

  // ================================================================
  // MAILBOXES
  // ================================================================

  async createMailbox(projectId: string, dto: CreateMailboxDto) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (!domain) throw new NotFoundException('Domain not found. Add the domain first.');

    if (domain.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Domain must be ACTIVE to create mailboxes. Current status: ${domain.status}`,
      );
    }

    const existing = await this.prisma.emailMailbox.findFirst({
      where: { domainId: domain.id, localPart: dto.localPart },
    });
    if (existing) throw new BadRequestException('Mailbox already exists on this domain');

    // Generate a strong temporary password for Stalwart — user must change it
    const tempPassword = crypto.randomBytes(20).toString('base64').slice(0, 24);
    const fullEmail = `${dto.localPart}@${domain.domain}`;

    let stalwartAccountId: string | undefined;
    try {
      const account = await this.stalwartJmap.createAccount(
        fullEmail,
        tempPassword,
        dto.name,
        dto.quotaMb,
      );
      stalwartAccountId = account.id;
    } catch (err) {
      this.logger.error(`Failed to create Stalwart account for ${fullEmail}: ${err}`);
      throw new InternalServerErrorException('Failed to create mailbox on mail server');
    }

    // Platform only stores stalwartAccountId — no password hash
    const mailbox = await this.prisma.emailMailbox.create({
      data: {
        domainId: domain.id,
        localPart: dto.localPart,
        name: dto.name,
        quota: BigInt(dto.quotaMb ?? 1024) * BigInt(1024 * 1024),
        stalwartAccountId,
      },
    });

    await this.eventService.emit('email.mailbox_created', {
      mailboxId: mailbox.id,
      projectId,
      email: fullEmail,
    });

    // Return credentials once — user must save them
    return {
      id: mailbox.id,
      email: fullEmail,
      name: dto.name,
      quotaMb: dto.quotaMb ?? 1024,
      // Credentials for Outlook/Thunderbird/mobile setup — shown ONLY once
      imapHost: this.configService.get('PLATFORM_MAIL_HOST', 'mail.deploy.fidscript.com'),
      imapPort: 993,
      smtpHost: this.configService.get('PLATFORM_MAIL_HOST', 'mail.deploy.fidscript.com'),
      smtpPort: 587,
      username: fullEmail,
      password: tempPassword, // TEMPORARY — user must change via IMAP
      message: 'This password is temporary. Change it after setup via IMAP settings.',
    };
  }

  async listMailboxes(projectId: string, domainId?: string) {
    const domains = domainId
      ? [await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } })]
      : await this.prisma.emailDomain.findMany({ where: { projectId } });

    const domainIds = domains.filter(Boolean).map((d) => d!.id);
    return this.prisma.emailMailbox.findMany({
      where: { domainId: { in: domainIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMailbox(projectId: string, mailboxId: string) {
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { id: mailboxId },
      include: { domain: { select: { domain: true, projectId: true } } },
    });
    if (!mailbox || mailbox.domain.projectId !== projectId) {
      throw new NotFoundException('Mailbox not found');
    }
    return mailbox;
  }

  async updateMailbox(projectId: string, mailboxId: string, dto: UpdateMailboxDto) {
    const mailbox = await this.getMailbox(projectId, mailboxId);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.quotaMb !== undefined) updateData.quota = BigInt(dto.quotaMb) * BigInt(1024 * 1024);
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
      if (mailbox.stalwartAccountId) {
        await this.stalwartJmap.setAccountStatus(mailbox.stalwartAccountId, dto.isActive);
      }
    }

    return this.prisma.emailMailbox.update({ where: { id: mailboxId }, data: updateData });
  }

  async suspendMailbox(projectId: string, mailboxId: string) {
    return this.updateMailbox(projectId, mailboxId, { isActive: false });
  }

  async activateMailbox(projectId: string, mailboxId: string) {
    return this.updateMailbox(projectId, mailboxId, { isActive: true });
  }

  async resetMailboxPassword(projectId: string, mailboxId: string, _dto: ResetMailboxPasswordDto) {
    const mailbox = await this.getMailbox(projectId, mailboxId);
    if (!mailbox.stalwartAccountId) {
      throw new InternalServerErrorException('Mailbox has no Stalwart account');
    }

    // Platform generates a new password — never accepts a user-supplied one
    const newPassword = crypto.randomBytes(20).toString('base64').slice(0, 24);
    await this.stalwartJmap.setAccountPassword(mailbox.stalwartAccountId, newPassword);

    return {
      success: true,
      email: `${mailbox.localPart}@${mailbox.domain.domain}`,
      password: newPassword, // returned once — shown only this time
      message: 'Password updated. Use the new password for IMAP/SMTP.',
    };
  }

  async deleteMailbox(projectId: string, mailboxId: string) {
    const mailbox = await this.getMailbox(projectId, mailboxId);

    if (mailbox.stalwartAccountId) {
      try {
        await this.stalwartJmap.deleteAccount(mailbox.stalwartAccountId);
      } catch (err) {
        this.logger.warn(`Failed to delete Stalwart account: ${err}`);
      }
    }

    await this.prisma.emailMailbox.delete({ where: { id: mailboxId } });

    await this.eventService.emit('email.mailbox_deleted', {
      mailboxId,
      projectId,
    });

    return { deleted: true };
  }

  // ================================================================
  // ALIASES
  // ================================================================

  async createAlias(projectId: string, dto: CreateAliasDto) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (domain.status !== 'ACTIVE') {
      throw new BadRequestException('Domain must be ACTIVE before creating aliases');
    }

    const existing = await this.prisma.emailAlias.findFirst({
      where: { domainId: domain.id, localPart: dto.localPart },
    });
    if (existing) throw new BadRequestException('Alias already exists on this domain');

    // Validate targets
    for (const target of dto.targets) {
      if (target.type === 'mailbox' && !target.mailboxId) {
        throw new BadRequestException('mailbox target requires mailboxId');
      }
      if (target.type === 'external' && !target.address) {
        throw new BadRequestException('external target requires address');
      }
      if (target.type === 'webhook' && !target.url) {
        throw new BadRequestException('webhook target requires url');
      }
      if (!['mailbox', 'external', 'webhook'].includes(target.type)) {
        throw new BadRequestException(`Unknown target type: ${target.type}`);
      }
    }

    const alias = await this.prisma.emailAlias.create({
      data: {
        domainId: domain.id,
        localPart: dto.localPart,
        targets: dto.targets,
        description: dto.description,
      },
    });

    await this.eventService.emit('email.alias_created', {
      aliasId: alias.id,
      projectId,
      email: `${dto.localPart}@${dto.domain}`,
    });

    // Sync alias routing to Stalwart — rebuild Sieve script for the target mailbox
    const mailboxTarget = dto.targets.find(t => t.type === 'mailbox' && t.mailboxId);
    if (mailboxTarget?.mailboxId) {
      try {
        const mb = await this.prisma.emailMailbox.findUnique({ where: { id: mailboxTarget.mailboxId } });
        if (mb?.stalwartAccountId) {
          await this.rebuildMailboxSieveScript(mb.stalwartAccountId, mb.id);
        }
      } catch (err) {
        this.logger.warn(`Failed to sync alias to Stalwart: ${err}`);
      }
    }

    return alias;
  }

  async listAliases(projectId: string, domainId?: string) {
    const domains = domainId
      ? [await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } })]
      : await this.prisma.emailDomain.findMany({ where: { projectId } });

    const domainIds = domains.filter(Boolean).map((d) => d!.id);
    return this.prisma.emailAlias.findMany({
      where: { domainId: { in: domainIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAlias(projectId: string, aliasId: string, dto: UpdateAliasDto) {
    const alias = await this.prisma.emailAlias.findFirst({
      where: { id: aliasId },
      include: { domain: { select: { projectId: true } } },
    });
    if (!alias || alias.domain.projectId !== projectId) {
      throw new NotFoundException('Alias not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.targets !== undefined) updateData.targets = dto.targets;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.description !== undefined) updateData.description = dto.description;

    return this.prisma.emailAlias.update({ where: { id: aliasId }, data: updateData });
  }

  async deleteAlias(projectId: string, aliasId: string) {
    const alias = await this.prisma.emailAlias.findFirst({
      where: { id: aliasId },
      include: { domain: { select: { projectId: true } } },
    });
    if (!alias || alias.domain.projectId !== projectId) {
      throw new NotFoundException('Alias not found');
    }

    // Rebuild Sieve script for affected mailbox (removes this alias from routing)
    const deletedTargets = alias.targets as Array<{ type: string; mailboxId?: string }>;
    const mailboxTarget = deletedTargets.find(t => t.type === 'mailbox' && t.mailboxId);
    if (mailboxTarget?.mailboxId) {
      try {
        const mb = await this.prisma.emailMailbox.findUnique({ where: { id: mailboxTarget.mailboxId } });
        if (mb?.stalwartAccountId) {
          await this.rebuildMailboxSieveScript(mb.stalwartAccountId, mb.id);
        }
      } catch (err) {
        this.logger.warn(`Failed to rebuild Stalwart sieve for mailbox: ${err}`);
      }
    }

    await this.prisma.emailAlias.delete({ where: { id: aliasId } });

    await this.eventService.emit('email.alias_deleted', {
      aliasId,
      projectId,
    });

    return { deleted: true };
  }

  // ================================================================
  // SENDER IDENTITIES
  // ================================================================

  async createSenderIdentity(projectId: string, dto: CreateSenderIdentityDto) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    // Domain must be ACTIVE (all DNS verified) before identities can be created
    if (domain.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Domain must be ACTIVE before creating sender identities. Current status: ${domain.status}. ` +
        'Complete DNS verification first.',
      );
    }

    const existing = await this.prisma.senderIdentity.findFirst({
      where: { domainId: domain.id, email: dto.email },
    });
    if (existing) throw new BadRequestException('Sender identity already exists');

    // Auto-verify if a matching active mailbox exists
    const [localPart] = dto.email.split('@');
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { domainId: domain.id, localPart, isActive: true },
    });

    const identity = await this.prisma.senderIdentity.create({
      data: {
        domainId: domain.id,
        email: dto.email,
        name: dto.name,
        // Only auto-verify if mailbox exists — otherwise requires manual verification
        isVerified: !!mailbox,
      },
    });

    // Create identity in Stalwart if we have a mailbox account
    if (mailbox?.stalwartAccountId) {
      try {
        await this.stalwartJmap.createIdentity(mailbox.stalwartAccountId, dto.email, dto.name);
      } catch (err) {
        this.logger.warn(`Failed to create Stalwart identity for ${dto.email}: ${err}`);
      }
    }

    await this.eventService.emit('email.identity_created', {
      identityId: identity.id,
      projectId,
      email: dto.email,
      isVerified: identity.isVerified,
    });

    return identity;
  }

  async listSenderIdentities(projectId: string, domainId?: string) {
    const domains = domainId
      ? [await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } })]
      : await this.prisma.emailDomain.findMany({ where: { projectId } });

    const domainIds = domains.filter(Boolean).map((d) => d!.id);
    return this.prisma.senderIdentity.findMany({
      where: { domainId: { in: domainIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSenderIdentity(projectId: string, identityId: string) {
    const identity = await this.prisma.senderIdentity.findFirst({
      where: { id: identityId },
      include: { domain: { select: { projectId: true } } },
    });
    if (!identity || identity.domain.projectId !== projectId) {
      throw new NotFoundException('Sender identity not found');
    }

    await this.prisma.senderIdentity.delete({ where: { id: identityId } });

    await this.eventService.emit('email.identity_deleted', {
      identityId,
      projectId,
    });

    return { deleted: true };
  }

  // ================================================================
  // API KEYS (Resend-style auth)
  // ================================================================

  async createEmailApiKey(projectId: string, dto: CreateEmailApiKeyDto) {
    const rawKey = `ek_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

    // Default: send-only. Valid: email.send | email.domains.read | email.mailboxes.read | email.messages.read | email.identities.read
    const scopes = dto.scopes?.length ? dto.scopes : ['email.send'];

    const apiKey = await this.prisma.emailApiKey.create({
      data: {
        projectId,
        name: dto.name,
        keyHash,
        scopes,
      },
    });

    await this.eventService.emit('email.api_key_created', {
      apiKeyId: apiKey.id,
      projectId,
      name: dto.name,
    });

    return { id: apiKey.id, name: dto.name, key: rawKey, scopes, dailyLimit: dto.dailyLimit ?? 1000, monthlyLimit: dto.monthlyLimit ?? 30000, createdAt: apiKey.createdAt };
  }

  async listEmailApiKeys(projectId: string) {
    return this.prisma.emailApiKey.findMany({
      where: { projectId },
      select: { id: true, name: true, scopes: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteEmailApiKey(projectId: string, apiKeyId: string) {
    const apiKey = await this.prisma.emailApiKey.findFirst({
      where: { id: apiKeyId, projectId },
    });
    if (!apiKey) throw new NotFoundException('API key not found');

    await this.prisma.emailApiKey.delete({ where: { id: apiKeyId } });

    await this.eventService.emit('email.api_key_deleted', {
      apiKeyId,
      projectId,
    });

    return { deleted: true };
  }

  // ================================================================
  // SEND EMAIL
  // ================================================================

  /**
   * Check if an API key can send (scope + rate limit check).
   */
  private async checkApiKeyCanSend(apiKeyId: string, projectId: string): Promise<{ allowed: boolean; reason?: string }> {
    const apiKey = await this.prisma.emailApiKey.findFirst({
      where: { id: apiKeyId, projectId },
    });
    if (!apiKey) return { allowed: false, reason: 'API key not found' };

    if (!apiKey.scopes?.includes('email.send')) {
      return { allowed: false, reason: 'API key does not have email.send scope' };
    }

    // Check if blocked
    const usage = await this.prisma.emailApiUsage.findFirst({
      where: {
        apiKeyId,
        projectId,
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    if (usage?.blockedUntil && new Date(usage.blockedUntil) > new Date()) {
      return { allowed: false, reason: `Key temporarily blocked until ${usage.blockedUntil.toISOString()}` };
    }

    if (usage && usage.sends >= (usage.dailyLimit ?? 1000)) {
      return { allowed: false, reason: `Daily limit reached (${usage.sends}/${usage.dailyLimit ?? 1000})` };
    }

    return { allowed: true };
  }

  async sendEmail(projectId: string, dto: SendEmailDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // Check API key scopes and rate limits if apiKeyId provided
    if (dto.apiKeyId) {
      const check = await this.checkApiKeyCanSend(dto.apiKeyId, projectId);
      if (!check.allowed) {
        throw new ForbiddenException(check.reason);
      }
    }

    // Resolve sender identity
    let senderIdentityId: string | undefined;
    let senderDomainStatus: string | undefined;
    if (dto.from) {
      const identity = await this.prisma.senderIdentity.findFirst({
        where: { email: dto.from },
        include: { domain: { select: { status: true } } },
      });
      if (identity) {
        senderIdentityId = identity.id;
        senderDomainStatus = identity.domain.status;
      }
      // Require domain to be ACTIVE before sending
      if (senderDomainStatus && senderDomainStatus !== 'ACTIVE') {
        throw new BadRequestException(
          `Sender domain must be ACTIVE. Current status: ${senderDomainStatus}`,
        );
      }

      // Check suppression list — reject sends to known bad recipients
      const suppressed = await this.prisma.emailSuppression.findFirst({
        where: { domain: { domain: dto.from.split('@')[1] }, email: dto.to.toLowerCase() },
      });
      if (suppressed) {
        throw new ForbiddenException(
          `Recipient ${dto.to} is suppressed (${suppressed.reason}). Cannot send.`,
        );
      }
    }

    // Send via SMTP to Stalwart
    const smtpHost = this.configService.get('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = parseInt(this.configService.get('STALWART_SMTP_PORT', '587') ?? '587');

    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: dto.from
        ? { user: dto.from, pass: dto.smtpPassword ?? '' }
        : undefined,
    });

    let messageId = `<${Date.now()}-${crypto.randomBytes(6).toString('hex')}@${this.configService.get('PLATFORM_MAIL_HOST', 'mail.deploy.fidscript.com')}>`;
    let accepted: string[] = [];
    let errorMsg: string | undefined;
    let result: 'sent' | 'failed' | 'bounced' = 'sent';

    try {
      const res = await transporter.sendMail({
        from: dto.from ?? this.configService.get('SMTP_FROM', 'noreply@localhost'),
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        replyTo: dto.replyTo,
      });
      messageId = res.messageId ?? messageId;
      accepted = (res.accepted ?? [dto.to]).filter((a): a is string => typeof a === 'string');
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      result = errorMsg.includes('bounce') || errorMsg.includes('550') ? 'bounced' : 'failed';
      this.logger.error(`SMTP send failed: ${errorMsg}`);
    }

    // Record metadata only — no body stored in Postgres/MinIO
    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        projectId,
        senderIdentityId,
        from: dto.from ?? this.configService.get('SMTP_FROM', 'noreply@localhost'),
        to: dto.to,
        subject: dto.subject,
        status: errorMsg ? (result === 'bounced' ? 'BOUNCED' : 'FAILED') : 'SUBMITTED',
        error: errorMsg,
      },
    });

    // Update rate limit counters
    await this.prisma.emailApiUsage.upsert({
      where: {
        projectId_apiKeyId_date: {
          projectId,
          apiKeyId: dto.apiKeyId ?? '',
          date: new Date(),
        },
      },
      create: {
        projectId,
        apiKeyId: dto.apiKeyId ?? '',
        date: new Date(),
        sends: result === 'sent' ? 1 : 0,
        failures: result === 'failed' ? 1 : 0,
        bounces: result === 'bounced' ? 1 : 0,
      },
      update: {
        sends: result === 'sent' ? { increment: 1 } : undefined,
        failures: result === 'failed' ? { increment: 1 } : undefined,
        bounces: result === 'bounced' ? { increment: 1 } : undefined,
      },
    });

    if (!errorMsg) {
      await this.eventService.emit('email.sent', {
        messageId: emailMessage.id,
        projectId,
        to: dto.to,
        from: dto.from,
      });
    }

    return {
      messageId: emailMessage.id,
      accepted,
      status: errorMsg ? (result === 'bounced' ? 'BOUNCED' : 'FAILED') : 'SUBMITTED',
      error: errorMsg,
    };
  }

  // ================================================================
  // MESSAGES (inbox metadata — body read from Stalwart via JMAP at display time)
  // ================================================================

  async listMessages(projectId: string, dto: ListMessagesDto) {
    const where: Record<string, unknown> = { projectId };
    if (dto.mailboxId) where.mailboxId = dto.mailboxId;
    if (dto.folder) {
      if (dto.folder === 'inbox') where.isDraft = false;
      else if (dto.folder === 'drafts') where.isDraft = true;
    }
    if (dto.unread !== undefined) where.isRead = !dto.unread;

    return this.prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 50,
      skip: dto.offset ?? 0,
    });
  }

  async getMessage(projectId: string, messageId: string) {
    const message = await this.prisma.emailMessage.findFirst({
      where: { id: messageId, projectId },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async markMessagesRead(projectId: string, dto: MarkMessagesReadDto) {
    await this.prisma.emailMessage.updateMany({
      where: { id: { in: dto.messageIds }, projectId },
      data: { isRead: dto.isRead },
    });
    return { updated: dto.messageIds.length };
  }

  async markMessageStarred(projectId: string, messageId: string, starred: boolean) {
    const message = await this.prisma.emailMessage.findFirst({
      where: { id: messageId, projectId },
    });
    if (!message) throw new NotFoundException('Message not found');

    return this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { isStarred: starred },
    });
  }

  async deleteMessages(projectId: string, dto: DeleteMessagesDto) {
    // Messages are metadata only — delete the row; body lives in Stalwart
    await this.prisma.emailMessage.deleteMany({
      where: { id: { in: dto.messageIds }, projectId },
    });
    return { deleted: dto.messageIds.length };
  }

  // ================================================================
  // HELPERS
  // ================================================================

  /**
   * Rebuild the combined Sieve forwarding script for a mailbox.
   * Called whenever aliases are added/removed/changed for this mailbox.
   * Aggregates all active aliases + catch-all into one script and pushes to Stalwart.
   */
  private async rebuildMailboxSieveScript(stalwartAccountId: string, mailboxId: string): Promise<void> {
    const mailbox = await this.prisma.emailMailbox.findUnique({
      where: { id: mailboxId },
      include: {
        domain: { include: { aliases: true, catchAllRules: true } },
      },
    });
    if (!mailbox) return;

    const lines: string[] = ['require ["fileinto", "redirect", "envelope"];'];

    // Add per-alias forwarding
    const activeAliases = mailbox.domain.aliases.filter(
      a => a.isActive && a.localPart !== mailbox.localPart,
    );
    for (const alias of activeAliases) {
      const targets = alias.targets as Array<{ type: string; address?: string; mailboxId?: string }>;
      const redirectTargets = targets.filter(t => t.type === 'mailbox' || t.type === 'external');
      for (const target of redirectTargets) {
        if (target.address) {
          lines.push(`# Alias: ${alias.localPart}@${mailbox.domain.domain}`);
          lines.push(`redirect "${target.address}";`);
        }
      }
    }

    // Add catch-all rule
    const catchAll = await this.prisma.catchAllRule.findUnique({
      where: { domainId: mailbox.domain.id },
    });
    if (catchAll?.isActive) {
      const target = catchAll.target as { type: string; address?: string; mailboxId?: string };
      if (target.type === 'external' && target.address) {
        lines.push('# Catch-all');
        lines.push(`redirect "${target.address}";`);
      }
    }

    await this.stalwartJmap.setSieveScript(stalwartAccountId, lines.join('\n'), 'active');
  }


  // ================================================================
  // INBOUND WEBHOOK (Stalwart sieve notify → create metadata row)
  // ================================================================

  async handleInboundEmail(payload: {
    from: string;
    to: string;
    subject: string;
    sizeBytes: number;
    spamScore?: number;
  }) {
    const [localPart, domainName] = payload.to.split('@');
    if (!domainName) return { success: false, reason: 'Invalid to address' };

    const domain = await this.prisma.emailDomain.findFirst({
      where: { domain: domainName },
    });
    if (!domain) return { success: false, reason: 'Domain not found' };

    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { domainId: domain.id, localPart, isActive: true },
    });

    // Check for alias with webhook targets
    const alias = await this.prisma.emailAlias.findFirst({
      where: { domainId: domain.id, localPart, isActive: true },
    });

    // Record metadata
    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        mailboxId: mailbox?.id,
        projectId: domain.projectId,
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        sizeBytes: BigInt(payload.sizeBytes),
        spamScore: payload.spamScore ?? null,
        status: 'ACCEPTED',
      },
    });

    await this.eventService.emit('email.received', {
      messageId: emailMessage.id,
      projectId: domain.projectId,
      mailboxId: mailbox?.id,
      from: payload.from,
      to: payload.to,
    });

    // Fire webhooks for any alias with a webhook target
    if (alias) {
      const webhookTargets = (alias.targets as Array<{ type: string; url?: string }>).filter(
        t => t.type === 'webhook' && t.url,
      );
      for (const target of webhookTargets) {
        const result = await this.webhookService.deliver(target.url!, {
          event: 'received',
          messageId: emailMessage.id,
          projectId: domain.projectId,
          mailboxId: mailbox?.id,
          to: payload.to,
          from: payload.from,
          subject: payload.subject,
          timestamp: new Date().toISOString(),
        });
        if (result.delivered) {
          await this.eventService.emit('email.webhook_triggered', {
            messageId: emailMessage.id,
            projectId: domain.projectId,
            url: target.url,
            attempts: result.attempts,
          });
        }
      }
    }

    return { success: true, messageId: emailMessage.id };
  }

  // ================================================================
  // BOUNCE INGESTION (Stalwart → platform via webhook)
  // ================================================================

  async handleBounce(payload: { messageId: string; to: string; error: string; code?: string }) {
    const message = await this.prisma.emailMessage.findFirst({
      where: {
        OR: [
          { id: payload.messageId },
          { to: payload.to },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!message) {
      this.logger.warn(`Bounce received for unknown message: ${payload.to}`);
      return { updated: false };
    }

    const isHardBounce = payload.code === '550' || payload.error.includes('User unknown') || payload.error.includes('mailbox not found');

    await this.prisma.emailMessage.update({
      where: { id: message.id },
      data: {
        status: 'BOUNCED',
        error: payload.error,
      },
    });

    // Add to suppression list — prevents future sends to this recipient
    if (isHardBounce) {
      const [, domainName] = payload.to.split('@');
      const emailDomain = domainName
        ? await this.prisma.emailDomain.findFirst({ where: { domain: domainName } })
        : null;
      if (emailDomain) {
        await this.prisma.emailSuppression.upsert({
          where: { domainId_email: { domainId: emailDomain.id, email: payload.to.toLowerCase() } },
          create: {
            domainId: emailDomain.id,
            email: payload.to.toLowerCase(),
            reason: 'BOUNCE',
          },
          update: { reason: 'BOUNCE' },
        }).catch(() => {/* already suppressed — that's fine */});
      }
    }

    await this.eventService.emit('email.bounced', {
      messageId: message.id,
      projectId: message.projectId,
      to: payload.to,
      error: payload.error,
      isHardBounce,
    });

    return { updated: true };
  }

  // ================================================================
  // COMPLAINT (FBL) INGESTION
  // ================================================================

  async handleComplaint(payload: { email: string; userAgent?: string }) {
    const [, domainName] = payload.email.split('@');
    if (!domainName) return { added: false };

    const emailDomain = await this.prisma.emailDomain.findFirst({ where: { domain: domainName } });
    if (!emailDomain) return { added: false };

    await this.prisma.emailSuppression.upsert({
      where: { domainId_email: { domainId: emailDomain.id, email: payload.email.toLowerCase() } },
      create: {
        domainId: emailDomain.id,
        email: payload.email.toLowerCase(),
        reason: 'COMPLAINT',
      },
      update: { reason: 'COMPLAINT' },
    }).catch(() => {/* already suppressed */});

    await this.eventService.emit('email.complained', {
      projectId: emailDomain.projectId,
      email: payload.email,
    });

    return { added: true };
  }

  // ================================================================
  // CATCH-ALL RULES
  // ================================================================

  async setCatchAll(
    projectId: string,
    domainId: string,
    dto: { targetType: 'mailbox' | 'external' | 'webhook'; targetId?: string; targetAddress?: string; webhookUrl?: string },
  ) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const target: Record<string, unknown> = { type: dto.targetType };
    if (dto.targetType === 'mailbox') target.mailboxId = dto.targetId;
    else if (dto.targetType === 'external') target.address = dto.targetAddress;
    else if (dto.targetType === 'webhook') target.url = dto.webhookUrl;

    return this.prisma.catchAllRule.upsert({
      where: { domainId },
      create: { domainId, target: target as unknown as object },
      update: { target: target as unknown as object },
    });
  }

  async deleteCatchAll(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    await this.prisma.catchAllRule.deleteMany({ where: { domainId } });
    return { deleted: true };
  }
}
