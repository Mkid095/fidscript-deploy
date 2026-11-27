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
import { isRecordNotFound } from './instant-api.request';

/** What the platform knows about a project's Instant app. */
export interface InstantAppStatus {
  appId: string;
  title: string;
  status: string;
  createdAt: Date;
}

/**
 * Owns the link between a FIDScript project and an Instant app — one per
 * project: the project's data plane. See `docs/CAPABILITY_OVERLAP.md`.
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
    });
    if (!row) return null;
    return {
      appId: row.appId,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  /**
   * The Instant app the operator points this project at through their own
   * env vars (`INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`) — their existing
   * session, not one the platform created. Null when they have not brought
   * one. Values are the AES-encrypted env rows, decrypted here; a value
   * that will not decrypt is read back as-is, the same as the deploy flow.
   */
  async operatorInstantApp(
    projectId: string,
  ): Promise<{ appId: string; adminToken: string | null } | null> {
    const rows = await this.prisma.projectEnv.findMany({
      where: { projectId, key: { in: ['INSTANT_APP_ID', 'INSTANT_ADMIN_TOKEN'] } },
    });
    const read = (key: string): string | null => {
      const row = rows.find((r) => r.key === key);
      if (!row) return null;
      try {
        return this.crypto.decrypt(row.value);
      } catch {
        return row.value;
      }
    };
    const appId = read('INSTANT_APP_ID');
    if (!appId) return null;
    return { appId, adminToken: read('INSTANT_ADMIN_TOKEN') };
  }

  /**
   * Point the project's data plane at an Instant app that already exists —
   * the operator's own session, verified against the dashboard API with its
   * admin token before the link is stored. The link row is upserted: linking
   * again replaces the app (and token) it held, so a stray app the platform
   * auto-created earlier is superseded rather than left dangling.
   */
  async link(
    projectId: string,
    actorId: string,
    appId: string,
    adminToken: string,
    title?: string,
  ): Promise<InstantAppStatus> {
    if (!appId || !adminToken) {
      throw new ConflictException(
        'Linking needs the app id and its admin token — the ones your application connects with.',
      );
    }

    // Verify the token really belongs to this app: the dashboard answers an
    // app read only when the bearer is a user of that app (its admin token).
    // A token that is not this app's comes back as an error, so we never
    // store a credential we cannot prove.
    let verified;
    try {
      verified = await this.client.getApp(appId, adminToken);
    } catch {
      throw new ConflictException(
        `The admin token is not valid for Instant app ${appId}.`,
      );
    }
    if (!verified) {
      throw new NotFoundException(`Instant app ${appId} not found.`);
    }

    const row = await this.prisma.projectInstantApp.upsert({
      where: { projectId },
      update: {
        appId: verified.id,
        title: verified.title || title || verified.id,
        adminTokenEnc: this.crypto.encrypt(adminToken),
        status: 'ACTIVE',
      },
      create: {
        projectId,
        appId: verified.id,
        title: verified.title || title || verified.id,
        adminTokenEnc: this.crypto.encrypt(adminToken),
        status: 'ACTIVE',
      },
    });

    this.emit('instant.app.linked', projectId, { appId: verified.id, title: row.title }, actorId);
    this.logger.log(`[instant] Linked app ${verified.id} to project ${projectId}`);

    return {
      appId: row.appId,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  /**
   * Provision an Instant app for a project.
   *
   * The app id and the admin token are generated here, not by Instant,
   * because Instant reads both out of the request body — so the platform
   * ends up holding a full-privilege credential for the app.
   */
  async provision(
    projectId: string,
    actorId: string,
    title?: string,
  ): Promise<InstantAppStatus> {
    if (!this.client.isConfigured()) {
      throw new ServiceUnavailableException(
        'The platform holds no Instant superuser token, so it cannot create apps. Set INSTANT_SUPERUSER_TOKEN_FILE.',
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
        title: app.title,
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
    type:
      | 'instant.app.provisioned'
      | 'instant.app.linked'
      | 'instant.app.deleted',
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
   * link, so the operator can retry.
   */
  async unlink(projectId: string, actorId: string): Promise<void> {
    const row = await this.prisma.projectInstantApp.findUnique({
      where: { projectId },
    });
    if (!row) throw new NotFoundException(`Project ${projectId} has no Instant app`);

    // Deleting needs the superuser token, because Instant resolves a USER
    // from the bearer on that route. An app that is already gone is not an
    // error — that is the state the operator asked for.
    try {
      await this.client.deleteApp(row.appId);
    } catch (err) {
      if (!isRecordNotFound(err, 'app')) throw err;
    }
    await this.prisma.projectInstantApp.delete({ where: { projectId } });

    this.emit('instant.app.deleted', projectId, { appId: row.appId }, actorId);
    this.logger.log(`[instant] Deleted app ${row.appId} for project ${projectId}`);
  }
}
