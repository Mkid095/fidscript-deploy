/**
 * Domains — DNS basics (records, health, SSL).
 * Attached to DomainsModule via `applyDnsMethods`.
 */

import type { DomainsHost } from './domains-host';

export function applyDnsMethods(host: DomainsHost): void {
  const client = host.client;

  host.getInstructions = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/instructions`);

  host.detectDnsProvider = async (projectId, domain) =>
    client.get(`/api/v1/projects/${projectId}/domains/detect`, { params: { domain } });

  host.getConnection = async (projectId) => {
    try {
      return await client.get(`/api/v1/projects/${projectId}/domains/connection`);
    } catch {
      return null;
    }
  };

  host.getHealth = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/health`);

  host.triggerHealthCheck = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/health`);

  host.getDnsRecords = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/dns-records`);

  host.getSsl = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/ssl`);

  host.renewSsl = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/ssl/renew`);

  host.reissueSsl = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/ssl/reissue`);

  host.getHistory = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/history`);

  host.getIncidents = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/incidents`);

  host.getHealthTimeline = async (projectId, domainId, _days = 30) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/health-timeline`);

  host.getWizard = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/wizard/${domainId}`);
}