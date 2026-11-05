import { IsString, IsOptional, IsEnum, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * The runtimes the platform can actually execute.
 *
 * php, go and rust used to be listed here and accepted — but there are no
 * runtime classes for them, so a function created with one wrote a
 * `handler.txt`, was validated with the PYTHON validator, and then failed
 * on invoke when the runtime tried to read `handler.py`. They are refused
 * at creation now, and the dashboard greys them out as "coming soon".
 */
export const FUNCTION_RUNTIMES = ['nodejs', 'python'] as const;
export type FunctionRuntime = typeof FUNCTION_RUNTIMES[number];

/**
 * The clients spell the runtime with its version ("nodejs20",
 * "python311"); the platform stores the bare name. Normalise on the way in
 * so both spellings work — the dashboard, the SDK, the CLI and the MCP all
 * send the versioned form, and the API rejected every one of them with a
 * 400 because the enum only knew "nodejs".
 */
const RUNTIME_ALIASES: Record<string, FunctionRuntime> = {
  nodejs: 'nodejs',
  node: 'nodejs',
  nodejs18: 'nodejs',
  nodejs20: 'nodejs',
  nodejs22: 'nodejs',
  python: 'python',
  py: 'python',
  python3: 'python',
  python310: 'python',
  python311: 'python',
  python312: 'python',
};

export const NormalizeFunctionRuntime = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const key = value.trim().toLowerCase().replace(/[-_\s]/g, '');
    return RUNTIME_ALIASES[key] ?? value;
  });

export class CreateFunctionDto {
  @ApiProperty({ example: 'hello' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: FUNCTION_RUNTIMES, example: 'nodejs' })
  @NormalizeFunctionRuntime()
  @IsEnum(FUNCTION_RUNTIMES, { message: 'runtime must be one of: nodejs, python' })
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
