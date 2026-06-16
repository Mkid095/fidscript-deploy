export class CreateCronJobDto {
  name!: string;
  cronExpression!: string;
  timezone?: string;
  endpoint?: string;
  functionId?: string;
  payload?: Record<string, unknown>;
  enabled?: boolean;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  timeoutSeconds?: number;
}

export class UpdateCronJobDto {
  name?: string;
  cronExpression?: string;
  timezone?: string;
  endpoint?: string;
  functionId?: string;
  payload?: Record<string, unknown>;
  enabled?: boolean;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  timeoutSeconds?: number;
}

export class TriggerCronJobDto {
  payload?: Record<string, unknown>;
}

export class GetCronJobRunsDto {
  limit?: number;
  cursor?: string;
  status?: string;
  startTime?: Date;
  endTime?: Date;
}