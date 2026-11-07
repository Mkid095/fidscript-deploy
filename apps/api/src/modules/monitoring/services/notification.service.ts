import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { EmailNotifier } from '../notifiers/email.notifier';
import { WebhookNotifier } from '../notifiers/webhook.notifier';
import { SlackNotifier } from '../notifiers/slack.notifier';
import { Notifier, AlertPayload } from '../notifiers/notifier.interface';
import { NotificationChannel } from '@prisma/client';

/**
 * Phase 14 — fan a firing alert out to its channels and record each delivery.
 *
 * Resolves a NotificationChannel to its Notifier by `type`, sends (with one
 * retry on failure), and writes a Notification row (sent/failed + error +
 * attempts). The channel "test" path sends a verification message without a
 * delivery record.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifiers: Map<string, Notifier>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    emailNotifier: EmailNotifier,
    webhookNotifier: WebhookNotifier,
    slackNotifier: SlackNotifier,
  ) {
    this.notifiers = new Map<string, Notifier>([
      [emailNotifier.type, emailNotifier],
      [webhookNotifier.type, webhookNotifier],
      [slackNotifier.type, slackNotifier],
    ]);
  }

  /** Dispatch a firing alert to every channel attached to its rule. */
  async dispatchForAlert(
    alert: { id: string; projectId: string; severity: string; message: string },
    rule: { id: string; name: string; channels: unknown },
  ): Promise<void> {
    const channelIds = (rule.channels as string[]) || [];
    if (!channelIds.length) {
      this.logger.debug(`alert ${alert.id} has no channels configured — nothing to dispatch`);
      return;
    }
    const channels = await this.prisma.notificationChannel.findMany({
      where: { id: { in: channelIds }, projectId: alert.projectId },
    });
    const payload: AlertPayload = {
      projectId: alert.projectId, ruleName: rule.name,
      severity: alert.severity, message: alert.message,
    };
    for (const channel of channels) {
      await this.recordAndSend(channel, payload, alert.id).catch((e: Error) =>
        this.logger.error(`dispatch to ${channel.id} failed: ${e.message}`),
      );
    }
  }

  /** Channel test: send a verification message, return the result (no record). */
  async testChannel(channel: {
    id: string; projectId: string; name: string; type: string; config: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: string }> {
    const notifier = this.notifiers.get(channel.type);
    if (!notifier) return { success: false, error: `unknown channel type "${channel.type}"` };
    return notifier.send(channel, {
      projectId: channel.projectId, ruleName: 'Test', severity: 'info',
      message: `This is a test notification from channel "${channel.name}".`,
    });
  }

  private async recordAndSend(
    channel: NotificationChannel,
    payload: AlertPayload,
    alertId: string,
  ): Promise<void> {
    const notifier = this.notifiers.get(channel.type);
    const record = await this.prisma.notification.create({
      data: { alertId, channelId: channel.id, type: channel.type, status: 'pending' },
    });
    if (!notifier) {
      await this.prisma.notification.update({
        where: { id: record.id },
        data: { status: 'failed', error: `unknown type "${channel.type}"`, attempts: 1 },
      });
      return;
    }
    const channelLike = {
      id: channel.id,
      projectId: channel.projectId,
      name: (channel as { name?: string }).name ?? channel.type,
      type: channel.type,
      config: (channel.config ?? {}) as Record<string, unknown>,
    };
    let result = await notifier.send(channelLike, payload);
    let attempts = 1;
    if (!result.success) {
      attempts += 1;
      result = await notifier.send(channelLike, payload);
    }
    await this.prisma.notification.update({
      where: { id: record.id },
      data: result.success
        ? { status: 'sent', attempts, sentAt: new Date() }
        : { status: 'failed', error: result.error, attempts },
    });
    await this.eventService.emit(
      result.success ? 'monitoring.notification.sent' : 'monitoring.notification.failed',
      payload.projectId,
      { alertId, channelId: channel.id, type: channel.type, status: result.success ? 'sent' : 'failed' },
    );
  }
}
