import { Injectable, Inject, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StorageService } from '@/modules/storage/services/storage.service';
import { RealtimeService } from '@/modules/realtime/realtime.service';
import { DbCrudService } from '@/modules/databases/services/db-crud.service';
import { DatabaseProvider, DATABASE_PROVIDER } from '@/modules/databases/providers/index';

const BCRYPT_ROUNDS = 12;
const PROJECT_API_KEY_BYTES = 24;

export interface ProvisionedResources {
  databaseId?: string;
  bucketId?: string;
  channelId?: string;
  apiKeyId?: string;
  apiKey?: string;
  errors: string[];
}

@Injectable()
export class ProjectProvisionService {
  private readonly logger = new Logger(ProjectProvisionService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private storage: StorageService,
    private realtime: RealtimeService,
    private dbCrud: DbCrudService,
    @Inject(DATABASE_PROVIDER) private dbProvider: DatabaseProvider,
  ) {}

  async provisionDefaults(projectId: string, ownerId: string, projectName: string): Promise<ProvisionedResources> {
    const result: ProvisionedResources = { errors: [] };
    const tasks: Promise<void>[] = [
      this.safeProvision('database', () => this.provisionDatabase(projectId, projectName).then((id) => { result.databaseId = id; })),
      this.safeProvision('bucket', () => this.provisionBucket(ownerId, projectId, projectName).then((id) => { result.bucketId = id; })),
      this.safeProvision('channel', () => this.provisionChannel(projectId, projectName).then((id) => { result.channelId = id; })),
      this.safeProvision('apiKey', () => this.provisionApiKey(projectId).then(({ id, key }) => {
        result.apiKeyId = id;
        result.apiKey = key;
      })),
    ];

    await Promise.allSettled(tasks);

    await this.eventService.emit('projects.project.provisioned', projectId, {
      projectId,
      databaseId: result.databaseId,
      bucketId: result.bucketId,
      channelId: result.channelId,
      apiKeyId: result.apiKeyId,
      errors: result.errors,
    });

    return result;
  }

  private async safeProvision(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.warn(`Failed to provision ${name}: ${msg}`);
      // Errors are intentionally swallowed — provisioning is fire-and-forget
      // so a partial failure does not block project creation.
    }
  }

  private async provisionDatabase(projectId: string, projectName: string): Promise<string> {
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9_]+/g, '_').substring(0, 30) || 'default';
    const database = await this.dbCrud.createDatabase(this.dbProvider, projectId, {
      name: `${safeName}__default`,
      type: 'postgresql',
      version: '15',
      size: 'small',
      maxConnections: 20,
      environment: 'production',
    });
    return (database as { id: string }).id;
  }

  private async provisionBucket(ownerId: string, projectId: string, projectName: string): Promise<string> {
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').substring(0, 30) || 'default';
    const bucket = await this.storage.createBucket(ownerId, projectId, `${safeName}-assets`, false, 'internal');
    return (bucket as { id: string }).id;
  }

  private async provisionChannel(projectId: string, projectName: string): Promise<string> {
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').substring(0, 40) || 'default';
    const channel = await this.realtime.createChannel(projectId, {
      name: `${safeName}-default`,
      isPrivate: false,
      metadata: { provisioned: true },
    });
    return channel.id;
  }

  private async provisionApiKey(projectId: string): Promise<{ id: string; key: string }> {
    const key = `fpk_${crypto.randomBytes(PROJECT_API_KEY_BYTES).toString('base64url')}`;
    // Use bcrypt to match validateProjectApiKey (which does bcrypt.compare
    // against the stored hash).  See project-api-key.service.ts.
    const keyHash = await bcrypt.hash(key.slice(4), BCRYPT_ROUNDS);
    const apiKey = await this.prisma.projectApiKey.create({
      data: {
        projectId,
        name: 'Default API Key',
        keyHash,
        permissions: ['read', 'write'],
      },
    });
    return { id: apiKey.id, key };
  }
}
