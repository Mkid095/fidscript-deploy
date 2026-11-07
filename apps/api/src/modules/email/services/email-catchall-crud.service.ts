import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Catch-all CRUD — owns the EmailCatchAllRule rows.
 *
 * `getCatchAll` / `setCatchAll` / `deleteCatchAll` are the HTTP endpoints
 * from `EmailCatchAllController`. The actual delivery (when an unmatched
 * address arrives) lives in `EmailCatchallDeliveryService` so this file
 * stays focused on persistence.
 */
@Injectable()
export class EmailCatchallCrudService {
  constructor(private prisma: PrismaService) {}

  async getCatchAll(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    const rule = await this.prisma.catchAllRule.findUnique({ where: { domainId } });
    return rule ?? null;
  }

  async setCatchAll(projectId: string, domainId: string, dto: {
    targetType: 'mailbox' | 'external' | 'webhook';
    targetId?: string; targetAddress?: string; webhookUrl?: string;
  }) {
    const domain = await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } });
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
    const domain = await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    await this.prisma.catchAllRule.deleteMany({ where: { domainId } });
    return { deleted: true };
  }
}
