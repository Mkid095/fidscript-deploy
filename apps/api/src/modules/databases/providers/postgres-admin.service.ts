import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as crypto from 'crypto';

@Injectable()
export class PostgresAdminService implements OnModuleInit {
  private adminPool: Pool | null = null;
  private adminHost: string = 'postgres';
  private adminPort: number = 5432;
  private adminUser: string = 'fidscript';
  private adminPassword: string = '';
  private adminDatabase: string = 'fidscript';

  constructor(private configService: ConfigService) {
    this.adminHost = this.configService.get<string>('DB_ADMIN_HOST', 'postgres');
    this.adminPort = this.configService.get<number>('DB_ADMIN_PORT', 5432);
    this.adminUser = this.configService.get<string>('DB_ADMIN_USER', 'fidscript');
    this.adminDatabase = this.configService.get<string>('DB_ADMIN_DATABASE', 'fidscript');
  }

  onModuleInit() {
    const passwordFile = this.configService.get<string>('DB_ADMIN_PASSWORD_FILE');
    if (passwordFile) {
      try {
        this.adminPassword = require('fs').readFileSync(passwordFile, 'utf8').trim();
      } catch { /* fall through to env var */ }
    }
    if (!this.adminPassword) {
      const directUrl = this.configService.get<string>('DIRECT_URL')
        || this.configService.get<string>('DATABASE_URL');
      if (directUrl) {
        try {
          const u = new URL(directUrl);
          this.adminPassword = u.password;
          this.adminUser = u.username;
        } catch { /* ignore parse failures */ }
      }
    }
  }

  async getPool(): Promise<Pool> {
    if (!this.adminPool) {
      this.adminPool = new Pool({
        host: this.adminHost,
        port: this.adminPort,
        user: this.adminUser,
        password: this.adminPassword,
        database: this.adminDatabase,
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
      this.adminPool.on('error', (err) => {
        console.error('[PostgresAdminService] admin pool error', err.message);
      });
    }
    return this.adminPool;
  }

  pgEnv(creds: { username: string; password: string; host: string; port: number; database: string }): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGUSER: creds.username,
      PGPASSWORD: creds.password,
      PGHOST: creds.host,
      PGPORT: String(creds.port),
      PGDATABASE: creds.database,
    };
  }

  async execute(sql: string): Promise<void> {
    const pool = await this.getPool();
    await pool.query(sql);
  }

  getAdminHost() { return this.adminHost; }
  getPgbouncerHost() { return this.configService.get<string>('PGBOUNCER_HOST', 'pgbouncer'); }
  getPgbouncerPort() { return this.configService.get<number>('PGBOUNCER_PORT', 6432); }
}
