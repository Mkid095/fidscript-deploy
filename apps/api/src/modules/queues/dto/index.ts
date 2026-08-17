import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsDefined, IsArray, IsBoolean } from 'class-validator';
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  retentionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxMessages?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadLetterQueue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  retryDelaySeconds?: number;
}

export class PublishMessageDto {
  @ApiProperty({ description: 'Message body — string or any serializable object' })
  @IsDefined()
  body!: string | Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional message headers' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Delay before delivery, in seconds' })
  @IsOptional()
  @IsNumber()
  delaySeconds?: number;
}

export class PublishBatchDto {
  @ApiProperty({ description: 'Batch of messages to publish' })
  @IsArray()
  messages!: Array<{
    body: string | Record<string, unknown>;
    headers?: Record<string, string>;
  }>;
}

export class ConsumeMessageDto {
  @ApiPropertyOptional({ description: 'Consumer ID — auto-generated if omitted' })
  @IsOptional()
  @IsString()
  consumerId?: string;

  @ApiPropertyOptional({ description: 'Max messages to return', default: 10 })
  @IsOptional()
  @IsNumber()
  maxMessages?: number;

  @ApiPropertyOptional({ description: 'Consume timeout, in seconds', default: 5 })
  @IsOptional()
  @IsNumber()
  timeoutSeconds?: number;
}

export class AcknowledgeMessageDto {
  @ApiProperty({ description: 'IDs of messages to acknowledge' })
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];
}

export class RetryMessageDto {
  @ApiProperty({ description: 'IDs of messages to retry' })
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];
}

export class MoveToDeadLetterDto {
  @ApiProperty({ description: 'IDs of messages to move to dead-letter queue' })
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];

  @ApiPropertyOptional({ description: 'Reason for moving to dead-letter queue' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PurgeQueueDto {
  @ApiPropertyOptional({ description: 'Also purge dead-letter messages. Default false.' })
  @IsOptional()
  @IsBoolean()
  includeDlq?: boolean;
}
