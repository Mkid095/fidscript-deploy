/**
 * Domains — Cloudflare OAuth and zone methods.
 * Attached to DomainsModule via `applyCloudflareMethods`.
 */

import type { DomainsHost } from './domains-host';

export function applyCloudflareMethods(host: DomainsHost): void {
  const client = host.client;

  host.connectCloudflare = (projectId, apiToken) =>
    client.post(`/api/v1/projects/${projectId}/domains/connect-cloudflare`, { apiToken });

  host.getCloudflareOAuthUrl = (projectId) =>
    client.get(`/api/v1/projects/${projectId}/domains/connect-cloudflare/oauth`);

  host.completeCloudflareOAuth = (code, state, projectId) =>
    client.post(`/api/v1/domains/connect-cloudflare/callback`, { code, state, projectId });

  host.listCloudflareZones = (projectId) =>
    client.get(`/api/v1/projects/${projectId}/domains/connect-cloudflare/zones`);

  host.testCloudflareConnection = (clientId, clientSecret) =>
    client.post(`/api/v1/installation/test-cloudflare-connection`, { clientId, clientSecret });

  host.getCloudflareOAuthStatus = () =>
    client.get(`/api/v1/installation/cloudflare-oauth-status`);
}