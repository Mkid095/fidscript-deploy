import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQueueDto {
  @ApiProperty({ description: 'Queue name (unique per project)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ['stream', 'queue', 'workqueue'], default: 'stream' })
  @IsOptional()
  @IsEnum(['stream', 'queue', 'workqueue'])
  type?: 'stream' | 'queue' | 'workqueue';

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @IsNumber()
  retentionDays?: number;

  @ApiPropertyOptional({ default: 100000 })
  @IsOptional()
  @IsNumber()
  maxMessages?: number;

  @ApiPropertyOptional({ default: 1073741824 })
  @IsOptional()
  @IsNumber()
  maxBytes?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  replicas?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsNumber()
  retryDelaySeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadLetterQueue?: string;
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

export class PurgeQueueDto {
  /** If true, also purges dead-letter messages for this queue. Default false. */
  includeDlq?: boolean;
}
