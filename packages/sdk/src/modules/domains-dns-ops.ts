/**
 * Domains — DNS operations (auto-configure, sync, plan).
 * Attached to DomainsModule via `applyDnsOpsMethods`.
 */

import type { DomainsHost } from './domains-host';

export function applyDnsOpsMethods(host: DomainsHost): void {
  const client = host.client;

  host.autoConfigureDnsRecords = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/dns-records/auto-configure`);

  host.autoConfigureEmailRecords = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/email-records/auto-configure`);

  host.getEmailRecordsStatus = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/email-records/status`);

  host.rotateDkim = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/dkim/rotate`);

  host.importZone = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/import-zone`);

  host.syncZone = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/sync-zone`);

  host.exportZone = async (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/export-zone`);

  host.getDnsPlan = async (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/dns-plan`);
}