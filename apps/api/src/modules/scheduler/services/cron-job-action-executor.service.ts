import { Injectable, Logger } from '@nestjs/common';
import { EmailMessageService } from '@/modules/email/services/message.service';
import { QueuesService } from '@/modules/queues/queues.service';

/**
 * Action-type-specific executors for cron jobs (email + queue).
 * The legacy function + http executors stay on CronJobExecutionService
 * because they have no external service dependency.
 *
 * Split out so CronJobExecutionService stays under the ANPAS 150-line cap.
 */

export interface EmailConfig {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface QueueConfig {
  queueId: string;
  body: unknown;
  headers?: Record<string, string>;
  delaySeconds?: number;
}

export type ActionExecResult = { success: boolean; error?: string };

@Injectable()
export class CronJobActionExecutorService {
  private readonly logger = new Logger(CronJobActionExecutorService.name);

  constructor(
    private emailMessageService: EmailMessageService,
    private queuesService: QueuesService,
  ) {}

  /**
   * Send an email via the project's email service. config must include `to`
   * and `subject`. text/html default to a JSON dump of overridePayload.
   */
  async executeEmail(
    projectId: string,
    config: EmailConfig | null,
    overridePayload: Record<string, unknown> | undefined,
    jobPayload: Record<string, unknown> | undefined,
  ): Promise<ActionExecResult> {
    if (!config || !config.to || !config.subject) {
      return { success: false, error: 'emailConfig missing required fields (to, subject)' };
    }
    const overrideText = typeof config.text === 'string' ? config.text : undefined;
    const overrideHtml = typeof config.html === 'string' ? config.html : undefined;
    try {
      await this.emailMessageService.sendEmail(projectId, {
        to: config.to,
        subject: config.subject,
        ...(config.from ? { from: config.from } : {}),
        ...(overrideText !== undefined
          ? { text: overrideText }
          : { text: JSON.stringify(overridePayload ?? jobPayload ?? {}) }),
        ...(overrideHtml !== undefined ? { html: overrideHtml } : {}),
      });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Publish a message to the project's queue. config.queueId is required.
   * body defaults to overridePayload ?? jobPayload.
   */
  async executeQueue(
    projectId: string,
    config: QueueConfig | null,
    overridePayload: Record<string, unknown> | undefined,
    jobPayload: Record<string, unknown> | undefined,
  ): Promise<ActionExecResult> {
    if (!config || !config.queueId) {
      return { success: false, error: 'queueConfig.queueId is required' };
    }
    try {
      const body = overridePayload ?? config.body ?? jobPayload ?? {};
      await this.queuesService.publishMessage(projectId, config.queueId, {
        body,
        ...(config.headers ? { headers: config.headers } : {}),
        ...(typeof config.delaySeconds === 'number' ? { delaySeconds: config.delaySeconds } : {}),
      });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}