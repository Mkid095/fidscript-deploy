import 'server-only';

import { serverApi as api } from './server';

/**
 * The project's email.
 *
 * Stalwart is behind all of this. The console never names it — the project
 * has domains, mailboxes and messages, and that is the whole of it.
 */

export interface EmailStatus {
  projectId: string;
  domain: string | null;
  dkim: { selector: string | null; publicKey: string | null; verified: boolean };
  spf: { verified: boolean };
  dmarc: { verified: boolean };
  mx: { verified: boolean; host: string | null };
  cloudflare: { connected: boolean; zoneId: string | null };
  status: string;
  smtpHost: string | null;
  imapHost: string | null;
  jmapUrl: string | null;
}

export interface EmailDomain {
  id: string;
  domain: string;
  status: string;
  ownershipToken: string | null;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  mxVerified: boolean;
  dkimSelector: string | null;
  createdAt: string;
}

export interface EmailMailbox {
  id: string;
  domainId: string;
  localPart: string;
  name: string | null;
  quota: number | string;
  isActive: boolean;
  createdAt: string;
}

/** How the mail of this project stands. */
export async function getEmailStatus(projectId: string): Promise<EmailStatus | null> {
  return api.get<EmailStatus>(`/projects/${projectId}/email/status`).catch(() => null);
}

/** The domains the project sends and receives mail for. */
export async function getEmailDomains(projectId: string): Promise<EmailDomain[]> {
  return api.get<EmailDomain[]>(`/projects/${projectId}/email/domains`).catch(() => []);
}

/** The mailboxes of the project. */
export async function getEmailMailboxes(projectId: string): Promise<EmailMailbox[]> {
  return api.get<EmailMailbox[]>(`/projects/${projectId}/email/mailboxes`).catch(() => []);
}

/** The keys that send mail on this project's behalf. */
export async function getEmailApiKeys(
  projectId: string,
): Promise<Array<{ id: string; name: string; createdAt: string }>> {
  return api
    .get<Array<{ id: string; name: string; createdAt: string }>>(
      `/projects/${projectId}/email/api-keys`,
    )
    .catch(() => []);
}
