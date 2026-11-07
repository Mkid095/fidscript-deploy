'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The project's mail.
 *
 * Adding a domain, proving it, and making a mailbox. The platform answers
 * with the DNS records that have to be set; the console shows them.
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

/** Check the domain's DNS records. */
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

/** Make a mailbox. */
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
