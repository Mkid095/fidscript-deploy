import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Narrow the type field to event-type strings without a regex */
export class QueryAuditEventsDto {
  @ApiPropertyOptional({
    description: 'Filter by actor (user) ID — exact match',
  })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({
    description: "Filter by actor type: 'user' | 'system' | 'api_key'",
    enum: ['user', 'system', 'api_key'],
  })
  @IsOptional()
  @IsEnum({ user: 'user', system: 'system', api_key: 'api_key' })
  actorType?: 'user' | 'system' | 'api_key';

  @ApiPropertyOptional({
    description: 'Filter by resource type, e.g. "user", "session", "deployment"',
  })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource ID — exact match',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by event type prefix, e.g. "identity.user" or exact "identity.user.logged_in"',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Filter by client IP address — exact or prefix match',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Show only failed events (e.g. login_failed, deployment.failed)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  failedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Start of date range (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End of date range (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Free-text search across metadata JSON', default: 50 })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Page size', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
