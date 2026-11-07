import { IsString, IsEnum, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StructuredLogEntry {
  @IsString() level!: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  @IsString() source!: string;
  @IsString() message!: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() timestamp?: string; // ISO-8601
}

export class IngestLogsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StructuredLogEntry)
  logs!: StructuredLogEntry[];
}
