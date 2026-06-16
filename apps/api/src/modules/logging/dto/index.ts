export class CreateLogStreamDto {
  name!: string;
  type!: 'application' | 'function' | 'deployment' | 'email' | 'system' | 'audit';
  retentionDays?: number;
}

export class GetLogsDto {
  stream?: string;
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  startTime?: Date;
  endTime?: Date;
  search?: string;
  limit?: number;
  cursor?: string;
}

export class WriteLogDto {
  stream!: string;
  level!: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message!: string;
  metadata?: Record<string, unknown>;
}

export class WriteBatchLogsDto {
  logs!: Array<{
    stream: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message: string;
    metadata?: Record<string, unknown>;
  }>;
}