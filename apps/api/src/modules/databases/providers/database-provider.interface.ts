export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionString: string;
  pgbouncerHost?: string;
  pgbouncerPort?: number;
  pgbouncerConnectionString?: string;
}

export interface BackupInfo {
  id: string;
  databaseId: string;
  filename: string;
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  createdAt: Date;
  completedAt?: Date;
}

export interface DatabaseProvider {
  provision(databaseId: string, name: string, options?: Record<string, unknown>): Promise<DatabaseCredentials>;
  delete(credentials: DatabaseCredentials): Promise<void>;
  backup(credentials: DatabaseCredentials, description?: string): Promise<BackupInfo>;
  restore(backup: BackupInfo, targetCredentials: DatabaseCredentials): Promise<void>;
  rotatePassword(credentials: DatabaseCredentials): Promise<{ password: string }>;
  getStatus(credentials: DatabaseCredentials): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown' }>;
}

export const DATABASE_PROVIDER = Symbol('DATABASE_PROVIDER');