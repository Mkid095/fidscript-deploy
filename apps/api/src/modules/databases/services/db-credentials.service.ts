import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { DatabaseProvider, DATABASE_PROVIDER, DatabaseCredentials } from '@/modules/databases/providers/index';

@Injectable()
export class DbCredentialsService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
    @Inject(DATABASE_PROVIDER) private dbProvider: DatabaseProvider,
  ) {}

  async rotateCredentials(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
    if (!database) throw new NotFoundException('Database not found');

    const credentials = this.parseConnectionInfo(database.connectionInfo!);
    const { password } = await this.dbProvider.rotatePassword(credentials);
    const newCredentials = { ...credentials, password };
    const newConnectionInfo = this.formatConnectionInfo(newCredentials);

    await this.prisma.managedDatabase.update({
      where: { id: databaseId },
      data: { connectionInfo: newConnectionInfo },
    });

    await this.injectDatabaseUrl(projectId, newCredentials);
    return { rotated: true };
  }

  async getConnectionInfo(projectId: string, databaseId: string, dto: { poolOnly?: boolean }) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
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

  async getStatus(projectId: string, databaseId: string) {
    const database = await this.prisma.managedDatabase.findFirst({ where: { id: databaseId, projectId } });
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
    return this.cryptoService.encrypt(JSON.stringify(creds));
  }

  private parseConnectionInfo(info: string | null | undefined): DatabaseCredentials {
    if (!info) throw new Error('No connection info stored');
    return JSON.parse(this.cryptoService.decrypt(info));
  }

  private async injectDatabaseUrl(projectId: string, credentials: DatabaseCredentials) {
    const dbUrl = credentials.pgbouncerConnectionString || credentials.connectionString;
    const envVars = [
      { key: 'DATABASE_URL', value: dbUrl },
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
