import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import { readFile, unlink, writeFile } from 'fs/promises';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';
import { PostgresAdminService } from './postgres-admin.service';
import { DatabaseCredentials, BackupInfo } from './database-provider.interface';

@Injectable()
export class PostgresBackupService {
  constructor(
    private admin: PostgresAdminService,
    private minioProvider: MinioProvider,
  ) {}

  async backup(credentials: DatabaseCredentials): Promise<BackupInfo> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const objectKey = `db-backups/${credentials.database}/${timestamp}_${backupId}.dump.gz`;
    const tmpFile = `/tmp/backup_${backupId}.dump.gz`;

    await this.runProcess(spawn('pg_dump', [
      '-h', credentials.host,
      '-p', String(credentials.port),
      '-U', credentials.username,
      '-d', credentials.database,
      '--format=custom',
      '-f', tmpFile,
    ], { env: this.admin.pgEnv(credentials) }));

    await this.runProcess(spawn('gzip', ['-f', tmpFile]));
    const gzFile = `${tmpFile}.gz`;

    const buffer = await readFile(gzFile);
    const sizeBytes = buffer.length;

    const bucket = `backups-${credentials.database.slice(0, 16)}`;
    await this.ensureBucket(bucket);
    await this.minioProvider.upload(objectKey, buffer, 'application/gzip');

    await unlink(gzFile).catch(() => {/* best-effort */});

    return {
      id: backupId,
      databaseId: credentials.database,
      filename: objectKey,
      size: sizeBytes,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async restore(backup: BackupInfo, targetCredentials: DatabaseCredentials): Promise<void> {
    const tmpFile = `/tmp/restore_${backup.id}.dump`;

    const buffer = await this.minioProvider.download(backup.filename);
    await writeFile(tmpFile, buffer);

    try {
      await this.runProcess(spawn('pg_restore', [
        '-h', targetCredentials.host,
        '-p', String(targetCredentials.port),
        '-U', targetCredentials.username,
        '-d', targetCredentials.database,
        '--format=custom',
        '--clean',
        '--if-exists',
        tmpFile,
      ], { env: this.admin.pgEnv(targetCredentials) }));
    } finally {
      await unlink(tmpFile).catch(() => {/* best-effort */});
    }
  }

  private async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.minioProvider.makeBucket(bucket);
    } catch (err: unknown) {
      if (!(err instanceof Error) || !err.message?.includes('already exists')) throw err;
    }
  }

  private runProcess(proc: ReturnType<typeof spawn>): Promise<void> {
    return new Promise((resolve, reject) => {
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`process exited with code ${code}`));
      });
      proc.on('error', reject);
    });
  }
}
