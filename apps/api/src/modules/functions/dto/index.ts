export class CreateFunctionDto {
  name!: string;
  runtime!: 'nodejs' | 'python' | 'php' | 'go' | 'rust';
  entryPoint?: string;
  memoryMb?: number;
  timeoutSeconds?: number;
  envVars?: Record<string, string>;
}

export class UpdateFunctionDto {
  memoryMb?: number;
  timeoutSeconds?: number;
  envVars?: Record<string, string>;
  settings?: Record<string, unknown>;
}

export class DeployFunctionDto {
  code!: string;
  version?: string;
  description?: string;
}

export class InvokeFunctionDto {
  payload?: string | Record<string, unknown>;
  sync?: boolean;
}

export class GetFunctionLogsDto {
  limit?: number;
  cursor?: string;
  startTime?: Date;
  endTime?: Date;
}