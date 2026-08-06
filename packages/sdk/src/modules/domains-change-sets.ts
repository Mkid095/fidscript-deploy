/**
 * Domains — change sets + propagation tracking.
 * Attached to DomainsModule via `applyChangeSetMethods`.
 */

import type { DomainsHost } from './domains-host';

export function applyChangeSetMethods(host: DomainsHost): void {
  const client = host.client;

  host.listChangeSets = (projectId, domainId, options) => {
    const params: Record<string, number> = {};
    if (options?.limit) params.limit = options.limit;
    return client.get(`/api/v1/projects/${projectId}/domains/${domainId}/change-sets`, params);
  };

  host.getManagedRecords = (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/managed-records`);

  host.importManagedRecords = (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/import-managed-records`);

  host.createChangeSet = (projectId, domainId, operations) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/change-sets`, { operations });

  host.applyChangeSet = (projectId, changeSetId) =>
    client.post(`/api/v1/projects/${projectId}/domains/change-sets/${changeSetId}/apply`);

  host.rollbackChangeSet = (projectId, changeSetId) =>
    client.post(`/api/v1/projects/${projectId}/domains/change-sets/${changeSetId}/rollback`);

  host.checkPropagation = (projectId, domainId, options) => {
    const params: Record<string, string> = {};
    if (options?.type) params.type = options.type;
    if (options?.name) params.name = options.name;
    if (options?.expected) params.expected = options.expected;
    return client.get(`/api/v1/projects/${projectId}/domains/${domainId}/propagation`, params);
  };
}