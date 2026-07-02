import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { SieveRebuildService } from '@/modules/email/services/sieve-rebuild.service';
import { CreateAliasDto } from '@/modules/email/dto/create-alias.dto';
import { UpdateAliasDto } from '@/modules/email/dto/update-alias.dto';

@Injectable()
export class EmailAliasService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private sieveRebuild: SieveRebuildService,
  ) {}

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
      data: { domainId: domain.id, localPart: dto.localPart, targets: JSON.parse(JSON.stringify(dto.targets)), description: dto.description },
    });

    await this.eventService.emit('email.alias_created', projectId, {
      aliasId: alias.id,
      email: `${dto.localPart}@${dto.domain}`,
    }, {});

    const mailboxTarget = dto.targets.find(t => t.type === 'mailbox' && t.mailboxId);
    if (mailboxTarget?.mailboxId) {
      const mb = await this.prisma.emailMailbox.findUnique({ where: { id: mailboxTarget.mailboxId } });
      if (mb?.stalwartAccountId) {
        await this.sieveRebuild.rebuild(mb.stalwartAccountId, mb.id);
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
      const mb = await this.prisma.emailMailbox.findUnique({ where: { id: mailboxTarget.mailboxId } });
      if (mb?.stalwartAccountId) {
        await this.sieveRebuild.rebuild(mb.stalwartAccountId, mb.id);
      }
    }

    await this.prisma.emailAlias.delete({ where: { id: aliasId } });

    await this.eventService.emit('email.alias_deleted', projectId, { aliasId }, {});

    return { deleted: true };
  }
}
