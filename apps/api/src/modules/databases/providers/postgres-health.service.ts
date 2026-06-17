import { Injectable } from '@nestjs/common';
import { PostgresAdminService } from './postgres-admin.service';
import { DatabaseCredentials } from './database-provider.interface';

@Injectable()
export class PostgresHealthService {
  constructor(private admin: PostgresAdminService) {}

  async getStatus(credentials: DatabaseCredentials): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown' }> {
    try {
      const pool = await this.admin.getPool();
      await pool.query('SELECT 1');
      return { status: 'healthy' };
    } catch {
      return { status: 'unhealthy' };
    }
  }

  async getSize(credentials: DatabaseCredentials): Promise<bigint> {
    const pool = await this.admin.getPool();
    const result = await pool.query(`SELECT pg_database_size($1) as size`, [credentials.database]);
    return BigInt(result.rows[0].size);
  }
}
