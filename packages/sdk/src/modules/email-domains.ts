/**
 * The email domains — the SDK's methods for them.
 *
 * They are in a file of their own because the module is bigger than the
 * limit, and because the domain methods answer a different shape from the
 * mailbox and alias ones: a domain is created with the DNS records the
 * operator has to add, and that envelope is part of the contract.
 */
import type { EmailDomain, EmailDomainCreated } from '@fidscript-deploy/types';
import type { EmailMailboxesHost } from './email-mailboxes';

export function applyDomainMethods(host: EmailMailboxesHost): void {
  const client = host.client;

  host.listDomains = async (projectId) => {
    const res = await client.get<EmailDomain[] | { domains: EmailDomain[] }>(
      `/api/v1/projects/${projectId}/email/domains`,
    );
    return Array.isArray(res) ? res : res.domains ?? [];
  };

  host.getDomain = (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}`);

  /**
   * Create an email domain.
   *
   * The answer carries the domain **and** the DNS steps the operator has to
   * follow. It used to be typed as `unknown`, which is how the dashboard
   * ended up casting the whole envelope to a row — and the page died on the
   * next `domain.id.slice(...)`.
   */
  host.createDomain = (projectId, domain) =>
    client.post<import('@fidscript-deploy/types').EmailDomainCreated>(
      `/api/v1/projects/${projectId}/email/domains`,
      { domain },
    );

  host.verifyDomain = (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/verify`);

  host.deleteDomain = (projectId, domainId) =>
    client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}`);
}
