import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { CryptoService } from '../crypto/crypto.service';
import { DatabaseProvider, DATABASE_PROVIDER, DatabaseCredentials } from './providers/index';
import {
  CreateDatabaseDto,
  UpdateDatabaseDto,
  CreateBackupDto,
  RestoreBackupDto,
  RotateCredentialsDto,
  GetConnectionInfoDto,
} from './dto/index';

@Injectable()
export class DatabasesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private cryptoService: CryptoService,
    @Inject(DATABASE_PROVIDER) private dbProvider: DatabaseProvider,
  ) {}

  async createDatabase(projectId: string, dto: CreateDatabaseDto) {
    const existing = await this.prisma.managedDatabase.findFirst({
      where: { projectId, name: dto.name },
    });
    if (existing) throw new Error('Database already exists');

    const database = await this.prisma.managedDatabase.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type || 'postgresql',
        version: dto.version || '15',
        size: dto.size || 'small',
        status: 'provisioning',
      },
    });

    try {
      const credentials = await this.dbProvider.provision(database.id, dto.name);
      const connectionInfo = this.formatConnectionInfo(credentials);

      await this.prisma.managedDatabase.update({
        where: { id: database.id },
        data: {
          status: 'ready',
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
          connectionInfo,
        },
      });

      await this.eventService.emit('database.provisioned', {
        databaseId: database.id,
        projectId,
        name: dto.name,
      });

      return this.getDatabase(projectId, database.id);
    } catch (error) {
      await this.prisma.managedDatabase.update({
        where: { id: database.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  async listDatabases(projectId: string) {
    const databases = await this.prisma.managedDatabase.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return databases.map((db) => this.formatDatabase(db as Record<string, unknown>));
  }

  async getDatabase(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');
    return this.formatDatabase(database as Record<string, unknown>);
  }

  async updateDatabase(projectId: string, databaseId: string, dto: UpdateDatabaseDto) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    const updated = await this.prisma.managedDatabase.update({
      where: { id: databaseId },
      data: {
        settings: (dto.settings) as any,
        backupRetentionDays: dto.backupRetentionDays,
      },
    });

    await this.eventService.emit('database.updated', { databaseId, projectId });
    return updated;
  }

  async deleteDatabase(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    try {
      const credentials = this.parseConnectionInfo(database.connectionInfo!);
      await this.dbProvider.delete(credentials);
    } catch { /* Continue with deletion */ }

    await this.prisma.managedDatabase.delete({ where: { id: databaseId } });
    await this.prisma.databaseBackup.deleteMany({ where: { databaseId } });

    await this.eventService.emit('database.deleted', { databaseId, projectId });
    return { deleted: true };
  }

  async createBackup(projectId: string, databaseId: string, dto: CreateBackupDto) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    const backup = await this.prisma.databaseBackup.create({
      data: { databaseId, status: 'in_progress', description: dto.description },
    });

    await this.eventService.emit('database.backup_started', { backupId: backup.id, databaseId, projectId });
    this.runBackup(backup.id, database).catch(console.error);

    return backup;
  }

  private async runBackup(backupId: string, database: any) {
    try {
      const credentials = this.parseConnectionInfo(database.connectionInfo!);
      const backupInfo = await this.dbProvider.backup(credentials, database.description);

      await this.prisma.databaseBackup.update({
        where: { id: backupId },
        data: {
          status: 'completed',
          filename: backupInfo.filename,
          size: backupInfo.size,
          completedAt: new Date(),
        },
      });

      await this.eventService.emit('database.backup_completed', { backupId, databaseId: database.id });
    } catch {
      await this.prisma.databaseBackup.update({
        where: { id: backupId },
        data: { status: 'failed' },
      });
    }
  }

  async listBackups(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    return this.prisma.databaseBackup.findMany({
      where: { databaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async restoreBackup(projectId: string, databaseId: string, dto: RestoreBackupDto) {
    const backup = await this.prisma.databaseBackup.findFirst({
      where: { id: dto.backupId, databaseId },
    });
    if (!backup) throw new NotFoundException('Backup not found');

    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    const credentials = this.parseConnectionInfo(database.connectionInfo!);
    const backupInfo = {
      id: backup.id,
      databaseId: backup.databaseId,
      filename: backup.filename || '',
      size: Number(backup.size),
      status: backup.status as 'completed' | 'failed' | 'in_progress',
      createdAt: backup.createdAt,
      completedAt: backup.completedAt || undefined,
    };

    await this.dbProvider.restore(backupInfo, credentials);
    await this.eventService.emit('database.restored', { backupId: backup.id, databaseId, projectId });

    return { restored: true };
  }

  async rotateCredentials(projectId: string, databaseId: string, _dto: RotateCredentialsDto) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    const credentials = this.parseConnectionInfo(database.connectionInfo!);
    const { password } = await this.dbProvider.rotatePassword(credentials);

    const newConnectionInfo = this.formatConnectionInfo({ ...credentials, password });

    await this.prisma.managedDatabase.update({
      where: { id: databaseId },
      data: { connectionInfo: newConnectionInfo },
    });

    return { rotated: true };
  }

  async getConnectionInfo(projectId: string, databaseId: string, dto: GetConnectionInfoDto) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    const credentials = this.parseConnectionInfo(database.connectionInfo!);

    if (dto.poolOnly) {
      return {
        host: credentials.pgbouncerHost || credentials.host,
        port: credentials.pgbouncerPort || credentials.port,
        database: credentials.database,
        connectionString: credentials.pgbouncerConnectionString || credentials.connectionString,
      };
    }

    return {
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.username,
      connectionString: credentials.connectionString,
    };
  }

  async getDatabaseStatus(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({
      where: { id: databaseId, projectId },
    });
    if (!database) throw new NotFoundException('Database not found');

    const credentials = this.parseConnectionInfo(database.connectionInfo!);
    const status = await this.dbProvider.getStatus(credentials);

    await this.prisma.managedDatabase.update({
      where: { id: databaseId },
      data: { status: status.status === 'healthy' ? 'ready' : 'unhealthy' },
    });

    return { status: status.status };
  }

  private formatConnectionInfo(creds: DatabaseCredentials): string {
    // Encrypt the full credential set before storing
    return this.cryptoService.encrypt(JSON.stringify(creds));
  }

  private parseConnectionInfo(info: string | null | undefined): DatabaseCredentials {
    if (!info) throw new Error('No connection info stored');
    // Decrypt before parsing — throws if tampered
    return JSON.parse(this.cryptoService.decrypt(info));
  }

  private formatDatabase(db: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { connectionInfo: _ci, ...safe } = db;
    return safe;
  }
}