'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * Adding a domain.
 *
 * The platform creates the record and answers with the DNS records that
 * have to be set at the registrar — the console shows them.
 */
export async function addDomainAction(
  projectId: string,
  input: { domain: string; type: string[] },
): Promise<{ ok?: boolean; domainId?: string; error?: string }> {
  const domain = input.domain.trim().toLowerCase();
  if (!domain) return { error: 'A domain needs a name.' };

  try {
    const response = await api.post<{ domain: { id: string } }>(`/projects/${projectId}/domains`, {
      domain,
      type: input.type,
      dnsMode: 'manual',
      sslEnabled: true,
    });
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true, domainId: response.domain.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The domain could not be added.',
    };
  }
}

/** The DNS records that have to be set at the registrar. */
export interface DnsInstruction {
  type: string;
  name: string;
  value: string;
  ttl?: number;
  notes?: string;
}

export async function domainInstructionsAction(
  projectId: string,
  domainId: string,
): Promise<{ ok?: boolean; records?: DnsInstruction[]; error?: string }> {
  try {
    const response = await api.get<{ instructions: DnsInstruction[] }>(
      `/projects/${projectId}/domains/${domainId}/instructions`,
    );
    return { ok: true, records: response.instructions };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The instructions could not be read.',
    };
  }
}
