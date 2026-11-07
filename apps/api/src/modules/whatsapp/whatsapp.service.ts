import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import axios from 'axios';

import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';

/**
 * The project's WhatsApp.
 *
 * The messaging itself lives in the WhatsApp platform — the Evolution API —
 * and the platform keeps only what it needs: the key that reaches it, and
 * which instance belongs to this project. The key is stored encrypted, like
 * every other credential the platform holds.
 */

export interface WhatsappInstance {
  name: string;
  status: string;
  number?: string;
  owner?: string;
}

export interface WhatsappState {
  /** Whether a key is held for this project. */
  connected: boolean;
  /** Whether the WhatsApp platform answered. */
  reachable: boolean;
  /** The instance this project owns, if it has one. */
  instance: WhatsappInstance | null;
  /** The instances the key can see. */
  instances: WhatsappInstance[];
  /** Why it could not be read, when it could not. */
  error?: string;
}

interface SettingsShape {
  whatsapp?: {
    encryptedKey?: string;
    instanceName?: string;
  };
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private config: ConfigService,
    private eventService: EventService,
  ) {}

  /** The platform's address. The WhatsApp platform may be elsewhere. */
  private baseUrl(): string {
    return (
      this.config.get<string>('EVOLUTION_API_URL', '') ||
      'http://platform-api:8080'
    ).replace(/\/+$/, '');
  }

  /**
   * The platform's own key to the WhatsApp platform, when it holds one.
   *
   * Read from a FILE when one is configured — like every other credential
   * the platform holds — so the installer can write it after the stack is
   * up and the platform picks it up without a restart.
   */
  private platformKey(): string | null {
    const file = this.config.get<string>('EVOLUTION_API_KEY_FILE', '');
    if (file) {
      try {
        const key = fs.readFileSync(file, 'utf8').trim();
        if (key) return key;
      } catch {
        // The file is not there yet. Try the env, then nothing.
      }
    }
    const key = this.config.get<string>('EVOLUTION_API_KEY', '');
    return key?.trim() || null;
  }

  /** Whether the platform can give a project its WhatsApp identity by itself. */
  hasPlatformKey(): boolean {
    return this.platformKey() !== null;
  }

  /** What this project holds of the WhatsApp platform. */
  async state(userId: string, projectId: string): Promise<WhatsappState> {
    const settings = await this.settings(projectId);
    const connection = settings?.whatsapp;

    if (!connection?.encryptedKey) {
      return {
        connected: false,
        reachable: false,
        instance: null,
        instances: [],
      };
    }

    const key = this.crypto.decrypt(connection.encryptedKey);
    const instances = await this.fetchInstances(key);

    if (!instances.ok) {
      return {
        connected: true,
        reachable: false,
        instance: null,
        instances: [],
        error: instances.error,
      };
    }

    const mine = connection.instanceName
      ? (instances.instances.find(
          (entry) => entry.name === connection.instanceName,
        ) ?? null)
      : null;

    return {
      connected: true,
      reachable: true,
      instance: mine,
      instances: instances.instances,
    };
  }

  /**
   * Connect the project to the WhatsApp platform.
   *
   * The key is checked against the platform before it is kept: a key that
   * cannot see the instances is refused, so the connection never pretends.
   */
  async connect(
    userId: string,
    projectId: string,
    apiKey: string,
    instanceName?: string,
  ): Promise<{ ok: boolean; instances: WhatsappInstance[]; error?: string }> {
    const key = apiKey.trim();
    if (!key) throw new BadRequestException('The API key is needed.');

    const fetched = await this.fetchInstances(key);
    if (!fetched.ok) {
      throw new BadRequestException(
        fetched.error ?? 'The WhatsApp platform did not accept that key.',
      );
    }

    const chosen = instanceName ?? fetched.instances[0]?.name ?? null;

    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        settings: {
          whatsapp: {
            encryptedKey: this.crypto.encrypt(key),
            instanceName: chosen,
          },
        } as unknown as object,
      },
      update: {
        settings: {
          whatsapp: {
            encryptedKey: this.crypto.encrypt(key),
            instanceName: chosen,
          },
        } as unknown as object,
      },
    });

    await this.eventService.emit('projects.whatsapp.connected', projectId, {
      instanceName: chosen,
    });

    return { ok: true, instances: fetched.instances };
  }

  /** Let the WhatsApp platform go. */
  async disconnect(
    userId: string,
    projectId: string,
  ): Promise<{ disconnected: boolean }> {
    const settings = await this.settings(projectId);
    const connection = settings?.whatsapp;
    if (!connection?.encryptedKey) return { disconnected: false };

    const next = { ...(settings as Record<string, unknown>) };
    delete next.whatsapp;

    await this.prisma.projectSettings.update({
      where: { projectId },
      data: { settings: next as unknown as object },
    });

    await this.eventService.emit(
      'projects.whatsapp.disconnected',
      projectId,
      {},
    );
    return { disconnected: true };
  }

  /**
   * The project's WhatsApp identity: its own instance on the WhatsApp
   * platform, named after the project.
   *
   * It is created **with the project** (P5.6) — so the project's WhatsApp
   * screen has its own instance waiting for pairing, rather than borrowing
   * the first instance a pasted key can see. The platform's own key is what
   * holds it; the person pairs it from the project's screen when they are
   * ready. An instance that is already there is not an error — that is the
   * state the last attempt left, and it is the state this one asked for.
   */
  async provisionIdentity(
    userId: string,
    projectId: string,
  ): Promise<{ instanceName: string; created: boolean; reason?: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, name: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const instanceName = project.slug;
    const key = this.platformKey();
    if (!key) {
      return {
        instanceName,
        created: false,
        reason:
          'The platform holds no key to the WhatsApp platform, so the instance cannot be created here.',
      };
    }

    let created = true;
    try {
      await axios.post(
        `${this.baseUrl()}/instance/create`,
        { instanceName, integration: 'WHATSAPP-BAILEYS' },
        { headers: { apikey: key }, timeout: 15_000 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const body = (err as { response?: { data?: unknown } }).response?.data;
      const bodyText =
        typeof body === 'string' ? body : JSON.stringify(body ?? '');
      if (/already exist/i.test(message) || /already exist/i.test(bodyText)) {
        created = false;
      } else {
        this.logger.warn(
          `Could not create the WhatsApp instance for ${projectId}: ${message} ${bodyText}`.trim(),
        );
        throw err;
      }
    }

    // The project holds the platform's key and names its instance — the
    // same shape `connect` leaves, without the pasted-key ceremony.
    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        settings: {
          whatsapp: {
            encryptedKey: this.crypto.encrypt(key),
            instanceName,
          },
        } as unknown as object,
      },
      update: {
        settings: {
          whatsapp: {
            encryptedKey: this.crypto.encrypt(key),
            instanceName,
          },
        } as unknown as object,
      },
    });

    await this.eventService.emit(
      'projects.whatsapp.identity_provisioned',
      projectId,
      {
        instanceName,
        created,
      },
    );

    this.logger.log(
      `[whatsapp] ${created ? 'Created' : 'Found'} instance ${instanceName} for project ${projectId}`,
    );
    return { instanceName, created };
  }

  /** The project's settings, and the WhatsApp part of them. */
  private async settings(projectId: string): Promise<SettingsShape | null> {
    const row = await this.prisma.projectSettings.findUnique({
      where: { projectId },
      select: { settings: true },
    });
    return (row?.settings as SettingsShape | null) ?? null;
  }

  /** The instances the key can see. */
  private async fetchInstances(
    key: string,
  ): Promise<
    { ok: true; instances: WhatsappInstance[] } | { ok: false; error: string }
  > {
    try {
      const response = await axios.get(
        `${this.baseUrl()}/instance/fetchInstances`,
        {
          headers: { apikey: key },
          timeout: 10_000,
        },
      );
      const list = Array.isArray(response.data) ? response.data : [];
      return {
        ok: true,
        instances: list.map((entry: Record<string, unknown>) => ({
          name: String(entry.name ?? ''),
          status: String(entry.status ?? 'unknown'),
          number: entry.number ? String(entry.number) : undefined,
          owner: entry.owner ? String(entry.owner) : undefined,
        })),
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'The WhatsApp platform could not be reached.';
      this.logger.warn(`Could not read the WhatsApp instances: ${message}`);
      return { ok: false, error: message };
    }
  }
}
