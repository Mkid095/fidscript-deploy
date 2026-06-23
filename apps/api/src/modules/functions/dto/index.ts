import { IsString, IsOptional, IsEnum, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const FUNCTION_RUNTIMES = ['nodejs', 'python', 'php', 'go', 'rust'] as const;
export type FunctionRuntime = typeof FUNCTION_RUNTIMES[number];

export class CreateFunctionDto {
  @ApiProperty({ example: 'hello' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: FUNCTION_RUNTIMES, example: 'nodejs' })
  @IsEnum(FUNCTION_RUNTIMES)
  runtime!: FunctionRuntime;

  @ApiPropertyOptional({ example: 'index.handler' })
  @IsOptional()
  @IsString()
  entryPoint?: string;

  @ApiPropertyOptional({ example: 256 })
  @IsOptional()
  @IsNumber()
  memoryMb?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  timeoutSeconds?: number;

  @ApiPropertyOptional({ example: { KEY: 'value' } })
  @IsOptional()
  @IsObject()
  envVars?: Record<string, string>;
}

export class UpdateFunctionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  memoryMb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeoutSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  envVars?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  /** Set the active version without redeploying (version must already be deployed). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentVersion?: string;
}

export class DeployFunctionDto {
  @ApiProperty({ example: 'exports.handler = async () => ({ statusCode: 200 });' })
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class InvokeFunctionDto {
  @ApiPropertyOptional({})
  @IsOptional()
  payload?: string | Record<string, unknown>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sync?: boolean;
}

export class GetFunctionLogsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsString()
  startTime?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsString()
  endTime?: Date;
}
