import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';
import { InstantClientService } from './instant-client.service';

/** What the platform knows about a project's Instant app. */
export interface InstantAppStatus {
  appId: string;
  title: string;
  status: string;
  createdAt: Date;
}

/**
 * Owns the link between a FIDScript project and an Instant app.
 *
 * The platform provisions one Instant app per project: it is the project's
 * data plane — its tables, its users, its permissions, its files. The managed
 * Postgres stays the database an application connects to. See
 * `docs/CAPABILITY_OVERLAP.md` for why the split falls here.
 */
@Injectable()
export class InstantProvisioningService {
  private readonly logger = new Logger(InstantProvisioningService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private client: InstantClientService,
    private eventService: EventService,
  ) {}

  /** The project's Instant app, if it has one. */
  async get(projectId: string): Promise<InstantAppStatus | null> {
    const row = await this.prisma.projectInstantApp.findUnique({
      where: { projectId },
      include: { project: { select: { name: true } } },
    });
    if (!row) return null;
    return {
      appId: row.appId,
      title: row.project.name,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  /**
   * Provision an Instant app for a project.
   *
   * The app id and the admin token are generated here, not by Instant,
   * because Instant reads both out of the request body — so the platform ends
   * up holding a full-privilege credential for the app. The title defaults to
   * the project's name.
   */
  async provision(
    projectId: string,
    actorId: string,
    title?: string,
  ): Promise<InstantAppStatus> {
    if (!this.client.isConfigured()) {
      throw new ServiceUnavailableException(
        'The platform holds no Instant superuser token, so it cannot create apps. ' +
          'Set INSTANT_SUPERUSER_TOKEN_FILE and restart the API.',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const existing = await this.prisma.projectInstantApp.findUnique({
      where: { projectId },
    });
    if (existing) {
      throw new ConflictException(
        `Project ${projectId} already has an Instant app (${existing.appId}).`,
      );
    }

    const appId = randomUUID();
    const adminToken = randomUUID();
    const app = await this.client.createApp(appId, title ?? project.name, adminToken);

    const row = await this.prisma.projectInstantApp.create({
      data: {
        projectId,
        appId: app.id,
        adminTokenEnc: this.crypto.encrypt(adminToken),
        status: 'ACTIVE',
      },
    });

    this.emit('instant.app.provisioned', projectId, { appId: app.id, title: app.title }, actorId);
    this.logger.log(`[instant] Provisioned app ${app.id} for project ${projectId}`);

    return {
      appId: row.appId,
      title: app.title,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  /** Emit a platform event about an Instant app. */
  private emit(
    type: 'instant.app.provisioned' | 'instant.app.deleted',
    projectId: string,
    payload: { appId: string; title?: string },
    actorId: string,
  ): void {
    this.eventService.emit(type, projectId, payload, {
      actorId,
      actorType: 'user',
      resourceType: 'instant_app',
      resourceId: payload.appId,
    });
  }

  /**
   * Delete the project's Instant app and forget it.
   *
   * The app is deleted FIRST: if that fails the platform still holds the
   * link, so the operator can retry. The other order would orphan an app
   * that still holds the project's data.
   */
  async unlink(projectId: string, actorId: string): Promise<void> {
    const row = await this.prisma.projectInstantApp.findUnique({
      where: { projectId },
    });
    if (!row) throw new NotFoundException(`Project ${projectId} has no Instant app`);

    const adminToken = this.crypto.decrypt(row.adminTokenEnc);
    await this.client.deleteApp(row.appId, adminToken);
    await this.prisma.projectInstantApp.delete({ where: { projectId } });

    this.emit('instant.app.deleted', projectId, { appId: row.appId }, actorId);
    this.logger.log(`[instant] Deleted app ${row.appId} for project ${projectId}`);
  }
}
