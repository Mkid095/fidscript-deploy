import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Every field of every DTO here is explicitly decorated: the platform's
 * global validation pipe runs with `forbidNonWhitelisted`, and an
 * undecorated field is rejected as "should not exist" — which is how the
 * console's log filters once got the whole logs endpoint refused with a
 * list of "property X should not exist".
 */

export class CreateLogStreamDto {
  @ApiPropertyOptional()
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    enum: ['application', 'function', 'deployment', 'email', 'system', 'audit'],
  })
  @IsIn(['application', 'function', 'deployment', 'email', 'system', 'audit'])
  type!:
    | 'application'
    | 'function'
    | 'deployment'
    | 'email'
    | 'system'
    | 'audit';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  retentionDays?: number;
}

export class GetLogsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stream?: string;

  @ApiPropertyOptional({ enum: ['debug', 'info', 'warn', 'error', 'fatal'] })
  @IsOptional()
  @IsIn(['debug', 'info', 'warn', 'error', 'fatal'])
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class WriteLogDto {
  @ApiPropertyOptional()
  @IsString()
  stream!: string;

  @ApiPropertyOptional({ enum: ['debug', 'info', 'warn', 'error', 'fatal'] })
  @IsIn(['debug', 'info', 'warn', 'error', 'fatal'])
  level!: 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  @ApiPropertyOptional()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class WriteLogEntryDto {
  @ApiPropertyOptional()
  @IsString()
  stream!: string;

  @ApiPropertyOptional({ enum: ['debug', 'info', 'warn', 'error', 'fatal'] })
  @IsIn(['debug', 'info', 'warn', 'error', 'fatal'])
  level!: 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  @ApiPropertyOptional()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WriteBatchLogsDto {
  @ApiPropertyOptional({ type: [WriteLogEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WriteLogEntryDto)
  logs!: WriteLogEntryDto[];
}
