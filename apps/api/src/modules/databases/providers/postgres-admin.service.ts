import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { readFile } from 'fs/promises';

@Injectable()
export class PostgresAdminService implements OnModuleInit {
  private readonly logger = new Logger(PostgresAdminService.name);
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

  async onModuleInit() {
    const passwordFile = this.configService.get<string>('DB_ADMIN_PASSWORD_FILE');
    if (passwordFile) {
      try {
        this.adminPassword = (await readFile(passwordFile, 'utf8')).trim();
      } catch (err) {
        this.logger.warn(`Failed to read DB_ADMIN_PASSWORD_FILE ${passwordFile}: ${err instanceof Error ? err.message : err}`);
      }
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
    this.logger.log(`PostgresAdminService initialized: host=${this.adminHost} user=${this.adminUser} db=${this.adminDatabase} pass_set=${!!this.adminPassword}`);
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
  getAdminUser() { return this.adminUser; }
  getAdminPassword() { return this.adminPassword; }
  getAdminPort() { return this.adminPort; }
  getAdminDatabase() { return this.adminDatabase; }
  getPgbouncerHost() { return this.configService.get<string>('PGBOUNCER_HOST', 'pgbouncer'); }
  getPgbouncerPort() { return this.configService.get<number>('PGBOUNCER_PORT', 6432); }
}
