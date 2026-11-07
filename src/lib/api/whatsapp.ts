import 'server-only';

import { serverApi as api } from './server';

/**
 * The project's WhatsApp.
 *
 * The messaging lives in the WhatsApp platform — the Evolution API. The
 * console reads what the platform holds for this project: whether it is
 * connected, which instance it owns, and what else the key can see.
 */
export interface WhatsappInstance {
  name: string;
  status: string;
  number?: string;
  owner?: string;
}

export interface WhatsappState {
  connected: boolean;
  reachable: boolean;
  instance: WhatsappInstance | null;
  instances: WhatsappInstance[];
  error?: string;
}

export async function getWhatsappState(projectId: string): Promise<WhatsappState | null> {
  return api
    .get<WhatsappState>(`/projects/${projectId}/whatsapp`)
    .catch(() => null);
}
