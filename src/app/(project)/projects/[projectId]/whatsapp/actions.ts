'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The project's WhatsApp.
 *
 * The key is checked against the WhatsApp platform before it is kept, and
 * it is stored encrypted — the platform never shows it again.
 */
export async function connectWhatsappAction(
  projectId: string,
  apiKey: string,
  instanceName?: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!apiKey.trim()) return { error: 'The API key is needed.' };

  try {
    await api.post(`/projects/${projectId}/whatsapp/connect`, {
      apiKey: apiKey.trim(),
      ...(instanceName ? { instanceName } : {}),
    });
    revalidatePath(`/projects/${projectId}/whatsapp`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The WhatsApp platform did not accept that key.',
    };
  }
}

/** Let the WhatsApp platform go. */
export async function disconnectWhatsappAction(
  projectId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/whatsapp`);
    revalidatePath(`/projects/${projectId}/whatsapp`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The WhatsApp platform could not be let go.',
    };
  }
}
