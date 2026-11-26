import { FidscriptClient } from '../client';

/** A WhatsApp instance, as the platform's provider reports it. */
export interface WhatsappInstance {
  name: string;
  status: string;
  number?: string;
  owner?: string;
}

/** The WhatsApp state of a project. */
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

/**
 * The WhatsApp platform, from the operator's side.
 *
 * The platform holds the key a project uses and the instance it owns; the
 * messaging itself stays in the WhatsApp provider (Evolution API). This
 * module is the seam: it says whether the project is connected, reachable,
 * and which instance is its own, and it is the way to connect or let go.
 *
 * The credential it stores is the project's, encrypted, like every other
 * credential the platform holds — not a second identity for the operator.
 */
export class WhatsappModule {
  constructor(private client: FidscriptClient) {}

  /** The project's WhatsApp state: connected, reachable, and its instance. */
  async state(projectId: string): Promise<WhatsappState> {
    return this.client.get(`/api/v1/projects/${projectId}/whatsapp`);
  }

  /**
   * Connect the project to the WhatsApp platform with a key. The platform
   * verifies the key can see at least one instance before it stores it, so
   * a connection never pretends.
   */
  async connect(
    projectId: string,
    apiKey: string,
    instanceName?: string,
  ): Promise<{ ok: boolean; instances: WhatsappInstance[]; error?: string }> {
    return this.client.post(`/api/v1/projects/${projectId}/whatsapp/connect`, {
      apiKey,
      instanceName,
    });
  }

  /**
   * Create (or create again) the project's own instance, named after the
   * project. The way back when provisioning had no key yet, or failed.
   */
  async identity(
    projectId: string,
  ): Promise<{ instanceName: string; created: boolean; reason?: string }> {
    return this.client.post(`/api/v1/projects/${projectId}/whatsapp/identity`);
  }

  /** Let the WhatsApp platform go: the key is dropped, the remote instance is not. */
  async disconnect(projectId: string): Promise<{ disconnected: boolean }> {
    return this.client.delete(`/api/v1/projects/${projectId}/whatsapp`);
  }
}
