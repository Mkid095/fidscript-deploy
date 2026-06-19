/**
 * Phase 14 — notification channels.
 *
 * A channel (NotificationChannel row) has a `type` and a JSON `config`. Each
 * type maps to a Notifier that knows how to deliver an alert to that channel.
 * Adding a channel type = adding a Notifier + registering it in
 * NotificationService.
 */

/** Minimal view of a NotificationChannel row (avoids importing Prisma here). */
export interface ChannelLike {
  id: string;
  projectId: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

/** What a notifier needs to format a message. */
export interface AlertPayload {
  projectId: string;
  ruleName: string;
  severity: string;
  message: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface Notifier {
  readonly type: string;
  send(channel: ChannelLike, alert: AlertPayload): Promise<SendResult>;
}
