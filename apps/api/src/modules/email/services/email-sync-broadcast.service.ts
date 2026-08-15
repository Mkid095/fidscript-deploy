/**
 * Email sync broadcast — emits `email.received` events and pushes
 * realtime updates to the project's dashboard room.
 *
 * Drives webhooks (via the platform event bus), the audit log, NATS
 * consumers, and the live UI inboxes.
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { RealtimeGateway } from '@/modules/realtime/gateways/realtime.gateway';

export interface BroadcastPayload {
  messageId: string;
  jmapMessageId: string;
  from: string;
  to: string;
  subject: string;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  receivedAt: string;
  preview: string;
}

@Injectable()
export class EmailSyncBroadcastService {
  private readonly logger = new Logger(EmailSyncBroadcastService.name);

  constructor(
    private events: EventService,
    private realtime: RealtimeGateway,
  ) {}

  /**
   * Emit a `email.received` event (drives webhooks/audit/NATS) and push
   * a live update to the dashboard's project room.
   */
  async broadcastReceived(
    projectId: string,
    mailboxLocal: string,
    mailboxId: string,
    isNew: boolean,
    payload: BroadcastPayload,
  ): Promise<void> {
    await this.events.emit('email.received', projectId, {
      messageId: payload.messageId,
      jmapMessageId: payload.jmapMessageId,
      mailboxId,
      mailboxLocal,
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      isNew,
    }, {});

    this.realtime.broadcastToProject(projectId, 'email.received', {
      messageId: payload.messageId,
      jmapMessageId: payload.jmapMessageId,
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      preview: payload.preview,
      isRead: payload.isRead,
      isStarred: payload.isStarred,
      isDraft: payload.isDraft,
      receivedAt: payload.receivedAt,
    });
  }
}
