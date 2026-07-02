import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateCronJobDto {
  @IsString()
  name!: string;

  @IsString()
  cronExpression!: string; // validated at service layer via cron.CronTime

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsString()
  @IsOptional()
  functionId?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  retryAttempts?: number;

  @IsNumber()
  @IsOptional()
  retryDelaySeconds?: number;

  @IsNumber()
  @IsOptional()
  timeoutSeconds?: number;
}

export class UpdateCronJobDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  cronExpression?: string; // validated at service layer via cron.CronTime

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsString()
  @IsOptional()
  functionId?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  retryAttempts?: number;

  @IsNumber()
  @IsOptional()
  retryDelaySeconds?: number;

  @IsNumber()
  @IsOptional()
  timeoutSeconds?: number;
}

export class TriggerCronJobDto {
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class GetCronJobRunsDto {
  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
