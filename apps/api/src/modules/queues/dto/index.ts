export class CreateQueueDto {
  name!: string;
  type?: 'stream' | 'queue' | 'workqueue';
  retentionDays?: number;
  maxMessages?: number;
  maxBytes?: number;
  replicas?: number;
}

export class UpdateQueueDto {
  retentionDays?: number;
  maxMessages?: number;
  maxBytes?: number;
  deadLetterQueue?: string;
  retryAttempts?: number;
  retryDelaySeconds?: number;
}

export class PublishMessageDto {
  body!: string | Record<string, unknown>;
  headers?: Record<string, string>;
  delaySeconds?: number;
}

export class PublishBatchDto {
  messages!: Array<{
    body: string | Record<string, unknown>;
    headers?: Record<string, string>;
  }>;
}

export class ConsumeMessageDto {
  queueId!: string;
  consumerId?: string;
  maxMessages?: number;
  timeoutSeconds?: number;
}

export class AcknowledgeMessageDto {
  messageIds!: string[];
}

export class RetryMessageDto {
  messageIds!: string[];
}

export class MoveToDeadLetterDto {
  messageIds!: string[];
  reason?: string;
}