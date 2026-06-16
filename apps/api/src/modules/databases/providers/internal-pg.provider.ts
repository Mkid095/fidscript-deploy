import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseProvider, DatabaseCredentials, BackupInfo } from './database-provider.interface.js';
import * as crypto from 'crypto';

@Injectable()
export class InternalPgProvider implements DatabaseProvider {
  private baseHost: string;
  private basePort: number;
  private pgbouncerHost: string;
  private pgbouncerPort: number;

  constructor(private configService: ConfigService) {
    this.baseHost = this.configService.get('DB_HOST', 'localhost');
    this.basePort = this.configService.get('DB_PORT', 5432);
    this.pgbouncerHost = this.configService.get('PGBOUNCER_HOST', 'localhost');
    this.pgbouncerPort = this.configService.get('PGBOUNCER_PORT', 6432);
  }

  async provision(databaseId: string, name: string, options?: Record<string, unknown>): Promise<DatabaseCredentials> {
    const username = `proj_${databaseId.replace(/-/g, '').slice(0, 16)}`;
    const password = crypto.randomBytes(24).toString('base64');
    const database = `proj_${databaseId.replace(/-/g, '').slice(0, 16)}`;

    return {
      host: this.baseHost,
      port: this.basePort,
      database,
      username,
      password,
      connectionString: `postgresql://${username}:${password}@${this.baseHost}:${this.basePort}/${database}`,
      pgbouncerHost: this.pgbouncerHost,
      pgbouncerPort: this.pgbouncerPort,
      pgbouncerConnectionString: `postgresql://${username}:${password}@${this.pgbouncerHost}:${this.pgbouncerPort}/${database}`,
    };
  }

  async delete(credentials: DatabaseCredentials): Promise<void> {
    // Drop user and database - would connect to postgres admin to execute
    // DROP DATABASE IF EXISTS ${credentials.database};
    // DROP USER IF EXISTS ${credentials.username};
  }

  async backup(credentials: DatabaseCredentials, description?: string): Promise<BackupInfo> {
    const filename = `backup_${credentials.database}_${Date.now()}.sql`;
    return {
      id: crypto.randomUUID(),
      databaseId: credentials.database,
      filename,
      size: 0,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async restore(backup: BackupInfo, targetCredentials: DatabaseCredentials): Promise<void> {
    // pg_restore -h ${targetCredentials.host} -U ${targetCredentials.username} -d ${targetCredentials.database} ${backup.filename}
  }

  async rotatePassword(credentials: DatabaseCredentials): Promise<{ password: string }> {
    const newPassword = crypto.randomBytes(24).toString('base64');
    // ALTER USER ${credentials.username} WITH PASSWORD '${newPassword}';
    return { password: newPassword };
  }

  async getStatus(credentials: DatabaseCredentials): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown' }> {
    return { status: 'healthy' };
  }
}