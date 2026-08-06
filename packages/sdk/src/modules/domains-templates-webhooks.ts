/**
 * Domains — templates + webhooks.
 * Attached to DomainsModule via `applyDomainsAuxMethods`.
 */

import type { DomainsHost } from './domains-host';

export function applyDomainsAuxMethods(host: DomainsHost): void {
  const client = host.client;

  // ── Domain Templates ──────────────────────────────────────────────────────

  host.listTemplates = (options) => {
    const params: Record<string, string> = {};
    if (options?.category) params.category = options.category;
    if (options?.popularOnly) params.popular = 'true';
    return client.get(`/api/v1/domain-templates`, params);
  };

  host.getTemplate = (id) =>
    client.get(`/api/v1/domain-templates/${id}`);

  // ── Domain Webhooks ───────────────────────────────────────────────────────

  host.listWebhooks = (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/domains/${domainId}/webhooks`);

  host.createWebhook = (projectId, domainId, options) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/webhooks`, options);

  host.updateWebhook = (projectId, domainId, webhookId, updates) =>
    client.patch(`/api/v1/projects/${projectId}/domains/${domainId}/webhooks/${webhookId}`, updates);

  host.deleteWebhook = (projectId, domainId, webhookId) =>
    client.delete(`/api/v1/projects/${projectId}/domains/${domainId}/webhooks/${webhookId}`);

  host.testWebhook = (projectId, domainId, webhookId) =>
    client.post(`/api/v1/projects/${projectId}/domains/${domainId}/webhooks/${webhookId}/test`);
}