import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { DatabaseProvider, DatabaseCredentials } from '@/modules/databases/providers/index';

@Injectable()
export class DbCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
  ) {}

  async createDatabase(
    provider: DatabaseProvider,
    projectId: string,
    dto: { name: string; type?: string; version?: string; size?: string; maxConnections?: number; environment?: string },
  ) {
    const existing = await this.prisma.managedDatabase.findFirst({ where: { projectId, name: dto.name } });
    if (existing) throw new Error('Database already exists');

    const database = await this.prisma.managedDatabase.create({
      data: {
        projectId, name: dto.name,
        environment: dto.environment || 'production',
        type: dto.type || 'postgresql',
        version: dto.version || '15',
        size: dto.size || 'small',
        maxConnections: dto.maxConnections || 20,
        provider: 'internal-postgres',
        status: 'provisioning',
      },
    });

    try {
      const credentials = await provider.provision(database.id, dto.name, { maxConnections: dto.maxConnections || 20 });
      const connectionInfo = this.formatConnectionInfo(credentials);
      const usedBytes = await provider.getSize(credentials);

      await this.prisma.managedDatabase.update({
        where: { id: database.id },
        data: { status: 'ready', host: credentials.host, port: credentials.port, username: credentials.username, connectionInfo, usedBytes: usedBytes !== undefined ? Number(usedBytes) : undefined },
      });

      await this.injectDatabaseUrl(projectId, credentials);
      await this.eventService.emit('database.provisioned', { databaseId: database.id, projectId, name: dto.name });

      return { id: database.id, projectId, name: dto.name, status: 'ready' };
    } catch (error) {
      await this.prisma.managedDatabase.update({ where: { id: database.id }, data: { status: 'failed' } });
      throw error;
    }
  }

  async listDatabases(projectId: string) {
    const databases = await this.prisma.managedDatabase.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    return databases.map(db => this.formatDatabase(db as Record<string, unknown>));
  }

  async getDatabase(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
    if (!database) throw new NotFoundException('Database not found');
    return this.formatDatabase(database as Record<string, unknown>);
  }

  async updateDatabase(projectId: string, databaseId: string, dto: { settings?: unknown; backupRetentionDays?: number }) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
    if (!database) throw new NotFoundException('Database not found');

    const updated = await this.prisma.managedDatabase.update({
      where: { id: databaseId },
      data: { settings: dto.settings as any, backupRetentionDays: dto.backupRetentionDays },
    });
    await this.eventService.emit('database.updated', { databaseId, projectId });
    return updated;
  }

  async deleteDatabase(provider: DatabaseProvider, projectId: string, databaseId: string, connectionInfo: string | null | undefined) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
    if (!database) throw new NotFoundException('Database not found');

    try {
      if (connectionInfo) {
        const credentials = this.parseConnectionInfo(connectionInfo);
        await provider.delete(credentials);
      }
    } catch { /* Continue with deletion */ }

    await this.prisma.managedDatabase.delete({ where: { id: databaseId } });
    await this.prisma.databaseBackup.deleteMany({ where: { databaseId } });
    await this.eventService.emit('database.deleted', { databaseId, projectId });
    return { deleted: true };
  }

  private formatConnectionInfo(creds: DatabaseCredentials): string {
    return this.cryptoService.encrypt(JSON.stringify(creds));
  }

  private parseConnectionInfo(info: string | null | undefined): DatabaseCredentials {
    if (!info) throw new Error('No connection info stored');
    return JSON.parse(this.cryptoService.decrypt(info));
  }

  formatDatabase(db: Record<string, unknown>) {
    const { connectionInfo: _ci, ...safe } = db;
    // Convert BigInt fields to Number for JSON serialization
    if ('sizeBytes' in safe) (safe as any).sizeBytes = safe.sizeBytes !== null ? Number(safe.sizeBytes) : null;
    if ('usedBytes' in safe) (safe as any).usedBytes = safe.usedBytes !== null ? Number(safe.usedBytes) : null;
    if ('maxConnections' in safe) (safe as any).maxConnections = Number(safe.maxConnections);
    return safe;
  }

  private async injectDatabaseUrl(projectId: string, credentials: DatabaseCredentials) {

    const envVars = [
      { key: 'DATABASE_URL', value: credentials.pgbouncerConnectionString || credentials.connectionString },
      { key: 'DB_HOST', value: credentials.pgbouncerHost || credentials.host },
      { key: 'DB_PORT', value: String(credentials.pgbouncerPort || credentials.port) },
      { key: 'DB_NAME', value: credentials.database },
      { key: 'DB_USER', value: credentials.username },
      { key: 'DB_PASSWORD', value: credentials.password },
    ];

    for (const { key, value } of envVars) {
      const encrypted = this.cryptoService.encrypt(value);
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key } },
        create: { projectId, key, value: encrypted },
        update: { value: encrypted },
      });
    }
  }
}
