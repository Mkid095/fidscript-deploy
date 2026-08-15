/**
 * Email webhook subscription CRUD — list / create / update / delete
 * subscriptions. The platform event listener and the actual delivery live
 * in EmailWebhookDispatchService.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';

export const VALID_EVENTS = ['delivered', 'opened', 'clicked', 'bounced', 'complained', 'sent', 'failed'];

@Injectable()
export class EmailWebhookSubscriptionCrudService {
  constructor(private prisma: PrismaService) {}

  async list(projectId: string) {
    return this.prisma.emailWebhookSubscription.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(projectId: string, input: { url: string; events: string[] }) {
    this.validateEvents(input.events);
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.emailWebhookSubscription.create({
      data: { projectId, url: input.url, secret, events: input.events },
    });
  }

  async update(projectId: string, id: string, input: Partial<{ url: string; events: string[]; isActive: boolean }>) {
    if (input.events) this.validateEvents(input.events);
    return this.prisma.emailWebhookSubscription.update({ where: { id }, data: input });
  }

  async delete(projectId: string, id: string) {
    await this.prisma.emailWebhookSubscription.delete({ where: { id } });
    return { deleted: true };
  }

  validateEvents(events: string[]) {
    const invalid = events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalid.length) {
      throw new Error(`Invalid event types: ${invalid.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}`);
    }
  }
}
