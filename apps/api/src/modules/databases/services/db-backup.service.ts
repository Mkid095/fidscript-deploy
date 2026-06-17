import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { DatabaseProvider, DATABASE_PROVIDER, DatabaseCredentials } from '@/modules/databases/providers/index';

@Injectable()
export class DbBackupService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
    @Inject(DATABASE_PROVIDER) private dbProvider: DatabaseProvider,
  ) {}

  async createBackup(projectId: string, databaseId: string, dto: { description?: string }) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
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
        data: { status: 'completed', filename: backupInfo.filename, size: backupInfo.size, completedAt: new Date() },
      });
      await this.eventService.emit('database.backup_completed', { backupId, databaseId: database.id });
    } catch {
      await this.prisma.databaseBackup.update({ where: { id: backupId }, data: { status: 'failed' } });
    }
  }

  async listBackups(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
    if (!database) throw new NotFoundException('Database not found');
    return this.prisma.databaseBackup.findMany({ where: { databaseId }, orderBy: { createdAt: 'desc' } });
  }

  async restoreBackup(projectId: string, databaseId: string, dto: { backupId: string }) {
    const backup = await this.prisma.databaseBackup.findFirst({ where: { id: dto.backupId, databaseId } });
    if (!backup) throw new NotFoundException('Backup not found');

    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
    if (!database) throw new NotFoundException('Database not found');

    const credentials = this.parseConnectionInfo(database.connectionInfo!);
    const backupInfo = {
      id: backup.id, databaseId: backup.databaseId,
      filename: backup.filename || '', size: Number(backup.size),
      status: backup.status as 'completed' | 'failed' | 'in_progress',
      createdAt: backup.createdAt, completedAt: backup.completedAt || undefined,
    };

    await this.dbProvider.restore(backupInfo, credentials);
    await this.eventService.emit('database.restored', { backupId: backup.id, databaseId, projectId });
    return { restored: true };
  }

  private parseConnectionInfo(info: string | null | undefined): DatabaseCredentials {
    if (!info) throw new Error('No connection info stored');
    return JSON.parse(this.cryptoService.decrypt(info));
  }
}
