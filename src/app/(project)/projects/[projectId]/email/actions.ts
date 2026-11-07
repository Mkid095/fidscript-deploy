'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The project's mail.
 *
 * Domains, mailboxes, aliases, keys and the sending of a message. All of it
 * is the platform's — the console asks, and says plainly what happened.
 */

/** Add a mail domain. The platform answers with the records to set. */
export async function addEmailDomainAction(
  projectId: string,
  domain: string,
): Promise<{ ok?: boolean; domainId?: string; steps?: string[]; error?: string }> {
  const name = domain.trim().toLowerCase();
  if (!name) return { error: 'A domain needs a name.' };

  try {
    const response = await api.post<{
      domain: { id: string };
      ownershipToken: string;
      steps: string[];
    }>(`/projects/${projectId}/email/domains`, { domain: name });
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true, domainId: response.domain.id, steps: response.steps };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The domain could not be added.',
    };
  }
}

/** Check a mail domain's records. */
export async function verifyEmailDomainAction(
  projectId: string,
  domainId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/email/domains/${domainId}/verify`);
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The domain could not be checked.',
    };
  }
}

/** Make a mailbox. The password is set here and never shown again. */
export async function createMailboxAction(
  projectId: string,
  input: { domain: string; localPart: string; password: string; name?: string },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/email/mailboxes`, {
      domain: input.domain,
      localPart: input.localPart,
      password: input.password,
      ...(input.name ? { name: input.name } : {}),
    });
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The mailbox could not be created.',
    };
  }
}

/** Give a mailbox a new password. */
export async function resetMailboxPasswordAction(
  projectId: string,
  mailboxId: string,
  password: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/email/mailboxes/${mailboxId}/reset-password`, {
      password,
    });
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The password could not be changed.',
    };
  }
}

/** Remove a mailbox. */
export async function deleteMailboxAction(
  projectId: string,
  mailboxId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/email/mailboxes/${mailboxId}`);
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The mailbox could not be removed.',
    };
  }
}

/** Make an alias: an address that forwards somewhere else. */
export async function createAliasAction(
  projectId: string,
  input: { domain: string; localPart: string; destination: string },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/email/aliases`, {
      domain: input.domain,
      localPart: input.localPart,
      destination: input.destination,
    });
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The alias could not be created.' };
  }
}

/** Remove an alias. */
export async function deleteAliasAction(
  projectId: string,
  aliasId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/email/aliases/${aliasId}`);
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The alias could not be removed.' };
  }
}

/** Make a key that sends mail on this project's behalf. */
export async function createEmailKeyAction(
  projectId: string,
  name: string,
): Promise<{ ok?: boolean; key?: string; error?: string }> {
  try {
    const response = await api.post<{ key?: string; apiKey?: { key?: string } }>(
      `/projects/${projectId}/email/api-keys`,
      { name },
    );
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true, key: response.key ?? response.apiKey?.key };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The key could not be made.' };
  }
}

/** Remove a key. */
export async function deleteEmailKeyAction(
  projectId: string,
  apiKeyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/email/api-keys/${apiKeyId}`);
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The key could not be removed.' };
  }
}

/** Register a webhook — the place the mail's story is told. */
export async function createWebhookAction(
  projectId: string,
  url: string,
  events: string[],
): Promise<{ ok?: boolean; error?: string }> {
  if (!url.trim()) return { error: 'The webhook needs a URL.' };
  if (events.length === 0) return { error: 'It has to be told about something.' };

  try {
    await api.post(`/projects/${projectId}/email/webhooks`, {
      url: url.trim(),
      events,
    });
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The webhook could not be added.',
    };
  }
}

/** Remove a webhook. */
export async function deleteWebhookAction(
  projectId: string,
  webhookId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/email/webhooks/${webhookId}`);
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The webhook could not be removed.',
    };
  }
}

/** Where the mail goes when it arrives for an address nobody wrote to. */
export async function setCatchAllAction(
  projectId: string,
  domainId: string,
  input: {
    targetType: 'mailbox' | 'external' | 'webhook';
    targetId?: string;
    targetAddress?: string;
    webhookUrl?: string;
  },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/email/domains/${domainId}/catch-all`, input);
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The rule could not be set.',
    };
  }
}

/** Send a message, so somebody can see that sending works. */
export async function sendTestEmailAction(
  projectId: string,
  input: { from: string; to: string; subject: string; text: string },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/email/send`, {
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    revalidatePath(`/projects/${projectId}/email`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The message could not be sent.',
    };
  }
}
