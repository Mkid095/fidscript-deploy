import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PlatformEvent } from '@fidscript/events';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Audit consumer — the first real event handler in the platform.
 * Fires for every event via @OnEvent('**'), writes a PlatformEvent row.
 * Idempotent: keys on event.id so JetStream re-delivery doesn't double-write.
 */
@Injectable()
export class AuditEventConsumer {
  private readonly logger = new Logger(AuditEventConsumer.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('**')
  async onPlatformEvent(event: PlatformEvent): Promise<void> {
    try {
      await this.prisma.platformEvent.upsert({
        where: { id: event.id },
        create: {
          id: event.id,
          type: event.type,
          timestamp: event.timestamp ?? new Date(),
          actorId: event.actorId ?? null,
          actorType: event.actorType ?? null,
          resourceType: event.resourceType ?? 'unknown',
          resourceId: event.resourceId ?? event.id,
          metadata: (event.metadata ?? {}) as any,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
        },
        update: {
          // Idempotent — already exists, no-op on update
        },
      });
    } catch (err) {
      // Don't rethrow — we don't want to break the emit chain for audit failures
      this.logger.error(`Failed to persist event ${event.type}[${event.id}]: ${(err as Error).message}`);
    }
  }
}