import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { PostgresAdminService } from './postgres-admin.service';
import { DatabaseCredentials } from './database-provider.interface';

@Injectable()
export class PostgresProvisionService {
  constructor(private admin: PostgresAdminService) {}

  async provision(databaseId: string, name: string, options?: Record<string, unknown>): Promise<DatabaseCredentials> {
    const slug = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 20);
    const prefix = databaseId.replace(/-/g, '').slice(0, 8);
    const dbName = `proj_${prefix}_${slug}`;
    const dbUser = `proj_${prefix}_${slug}`;
    const password = crypto.randomBytes(24).toString('base64url');
    const connLimit = (options?.['maxConnections'] as number) || 20;

    const pool = await this.admin.getPool();

    const quotedDb = `"${dbName.replace(/"/g, '""')}"`;
    const quotedUser = `"${dbUser.replace(/"/g, '""')}"`;
    const safePass = password.replace(/'/g, "''");

    await pool.query(`CREATE DATABASE ${quotedDb}`);
    await pool.query(
      // LOGIN (not NOLOGIN) — this role IS the account the app pool connects
      // with. NOLOGIN made every provisioned database unconnectable.
      `CREATE ROLE ${quotedUser} WITH PASSWORD '${safePass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN CONNECTION LIMIT ${connLimit}`,
    );
    await pool.query(`ALTER ROLE ${quotedUser} SET statement_timeout TO '60s'`);
    await pool.query(`GRANT CONNECT ON DATABASE ${quotedDb} TO ${quotedUser}`);

    const ownerPool = new Pool({
      host: this.admin.getAdminHost(),
      port: this.admin.getAdminPort(),
      user: this.admin.getAdminUser(),
      password: this.admin.getAdminPassword(),
      database: dbName,
      max: 2,
    });
    try {
      await ownerPool.query(`GRANT ALL ON SCHEMA public TO ${quotedUser}`);
      await ownerPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${quotedUser}`);
      await ownerPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${quotedUser}`);
    } finally {
      await ownerPool.end();
    }

    await pool.query(`REVOKE ALL ON SCHEMA public FROM PUBLIC`);

    return this.buildCredentials(dbName, dbUser, password);
  }

  async delete(credentials: DatabaseCredentials): Promise<void> {
    const pool = await this.admin.getPool();
    const dbName = credentials.database;
    const dbUser = credentials.username;
    const quotedDb = `"${dbName.replace(/"/g, '""')}"`;
    const quotedUser = `"${dbUser.replace(/"/g, '""')}"`;

    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    await pool.query(`DROP DATABASE IF EXISTS ${quotedDb}`);
    await pool.query(`DROP ROLE IF EXISTS ${quotedUser}`);
  }

  async rotatePassword(credentials: DatabaseCredentials): Promise<{ password: string }> {
    const newPassword = crypto.randomBytes(24).toString('base64url');
    const quotedUser = `"${credentials.username.replace(/"/g, '""')}"`;
    const safePass = newPassword.replace(/'/g, "''");
    await this.admin.execute(`ALTER ROLE ${quotedUser} WITH PASSWORD '${safePass}'`);
    return { password: newPassword };
  }

  private buildCredentials(database: string, username: string, password: string): DatabaseCredentials {
    const sslSuffix = '?sslmode=require';
    const host = this.admin.getAdminHost();
    const port = 5432;
    const pgbHost = this.admin.getPgbouncerHost();
    const pgbPort = this.admin.getPgbouncerPort();
    const connStr = `postgresql://${username}:${password}@${host}:${port}/${database}${sslSuffix}`;
    const pgbouncerConnStr = `postgresql://${username}:${password}@${pgbHost}:${pgbPort}/${database}${sslSuffix}`;
    return {
      host, port, database, username, password,
      connectionString: connStr,
      pgbouncerHost: pgbHost,
      pgbouncerPort: pgbPort,
      pgbouncerConnectionString: pgbouncerConnStr,
    };
  }
}
