import 'server-only';

import { serverApi as api } from './server';

/**
 * The project's email.
 *
 * Stalwart is behind all of this. The console never names it — the project
 * has domains, mailboxes and messages, and that is the whole of it.
 */

export interface EmailDomain {
  id: string;
  domain: string;
  /** pending, verified, active, failed… */
  status: string;
  ownershipToken: string | null;
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  dkimSelector: string | null;
  createdAt: string;
}

export interface EmailStatus {
  projectId: string;
  domain: string | null;
  dkim: {
    selector: string | null;
    publicKey: string | null;
    verified: boolean;
  };
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

export interface EmailAlias {
  id: string;
  domainId: string;
  localPart: string;
  destination: string;
  isActive: boolean;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface EmailAnalytics {
  total: number;
  rangeDays: number;
  byStatus: {
    queued: number;
    processing: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    [key: string]: number;
  };
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
export async function getEmailStatus(
  projectId: string,
): Promise<EmailStatus | null> {
  return api
    .get<EmailStatus>(`/projects/${projectId}/email/status`)
    .catch(() => null);
}

/** The domains the project sends and receives mail for. */
export async function getEmailDomains(
  projectId: string,
): Promise<EmailDomain[]> {
  return api
    .get<EmailDomain[]>(`/projects/${projectId}/email/domains`)
    .catch(() => []);
}

/** The mailboxes of the project. */
export async function getEmailMailboxes(
  projectId: string,
): Promise<EmailMailbox[]> {
  return api
    .get<EmailMailbox[]>(`/projects/${projectId}/email/mailboxes`)
    .catch(() => []);
}

/** The keys that send mail on this project's behalf. */
export async function getEmailApiKeys(
  projectId: string,
): Promise<Array<{ id: string; name: string; createdAt: string }>> {
  return api
    .get<
      Array<{ id: string; name: string; createdAt: string }>
    >(`/projects/${projectId}/email/api-keys`)
    .catch(() => []);
}

export interface EmailWebhook {
  id: string;
  url: string;
  events: string[];
  isActive?: boolean;
}

/** The webhooks — the places the mail's story is told. */
export async function getEmailWebhooks(
  projectId: string,
): Promise<EmailWebhook[]> {
  const response = await api
    .get<{
      webhooks?: EmailWebhook[];
      subscriptions?: EmailWebhook[];
    }>(`/projects/${projectId}/email/webhooks`)
    .catch(() => ({
      webhooks: [] as EmailWebhook[],
      subscriptions: [] as EmailWebhook[],
    }));
  return response.webhooks ?? response.subscriptions ?? [];
}

/** The aliases — an address that forwards somewhere else. */
export async function getEmailAliases(
  projectId: string,
): Promise<EmailAlias[]> {
  return api
    .get<EmailAlias[]>(`/projects/${projectId}/email/aliases`)
    .catch(() => []);
}

/** The messages this project has sent and received. */
export async function getEmailMessages(
  projectId: string,
): Promise<EmailMessage[]> {
  return api
    .get<EmailMessage[]>(`/projects/${projectId}/email/messages`)
    .catch(() => []);
}

/** How the mail has been going — delivered, bounced, opened. */
export async function getEmailAnalytics(
  projectId: string,
): Promise<EmailAnalytics | null> {
  return api
    .get<EmailAnalytics>(`/projects/${projectId}/email/analytics/overview`)
    .catch(() => null);
}
