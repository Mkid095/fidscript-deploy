export class CreateDatabaseDto {
  name!: string;
  type?: 'postgresql' | 'mysql' | 'redis';
  version?: string;
  size?: string;
}

export class UpdateDatabaseDto {
  settings?: Record<string, unknown>;
  backupRetentionDays?: number;
}

export class CreateBackupDto {
  description?: string;
}

export class RestoreBackupDto {
  backupId!: string;
  targetDatabaseId?: string;
}

export class RotateCredentialsDto {
  userId?: string;
}

export class GetConnectionInfoDto {
  poolOnly?: boolean;
}