export class CreateDatabaseDto {
  name!: string;
  environment?: 'production' | 'staging' | 'preview' | 'development';
  type?: 'postgresql' | 'mysql' | 'redis';
  version?: string;
  size?: string;
  maxConnections?: number;
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

/** Strip connectionInfo from list/get responses — never leak credentials */
export class DatabaseResponseDto {
  id!: string;
  projectId!: string;
  name!: string;
  type!: string;
  version!: string;
  size!: string;
  status!: string;
  host!: string | null;
  port!: number | null;
  username!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}