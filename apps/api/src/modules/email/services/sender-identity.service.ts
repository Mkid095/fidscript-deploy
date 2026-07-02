import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StalwartIdentityService } from '@/modules/email/stalwart/stalwart-identity.service';
import { CreateSenderIdentityDto } from '@/modules/email/dto/create-sender-identity.dto';

@Injectable()
export class EmailSenderIdentityService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private stalwartIdentity: StalwartIdentityService,
  ) {}

  async createSenderIdentity(projectId: string, dto: CreateSenderIdentityDto) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (!domain) throw new NotFoundException('Domain not found');

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

    // Auto-verify if a matching active mailbox exists on this domain
    const [localPart] = dto.email.split('@');
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { domainId: domain.id, localPart, isActive: true },
    });

    const identity = await this.prisma.senderIdentity.create({
      data: {
        domainId: domain.id,
        email: dto.email,
        name: dto.name,
        isVerified: !!mailbox,
      },
    });

    if (mailbox?.stalwartAccountId) {
      try {
        await this.stalwartIdentity.createIdentity(mailbox.stalwartAccountId, dto.email, dto.name);
      } catch (err) {
        // Non-fatal — log and continue
      }
    }

    await this.eventService.emit('email.identity_created', projectId, {
      identityId: identity.id,
      email: dto.email,
      isVerified: identity.isVerified,
    }, {});

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

    await this.eventService.emit('email.identity_deleted', projectId, { identityId }, {});

    return { deleted: true };
  }
}
