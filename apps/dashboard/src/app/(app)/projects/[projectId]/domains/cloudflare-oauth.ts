'use client';

import type { DnsConnection } from '@fidscript-deploy/sdk';

export async function startCloudflareOAuth(
  projectId: string,
  getSdk: () => any,
  callbacks: {
    onSuccess: (connection: DnsConnection, domains: any[]) => void;
    onError: (err: Error) => void;
  },
) {
  const sdk = getSdk();
  const { url, state } = await sdk.domains.getCloudflareOAuthUrl(projectId) as { url: string; state: string };
  const w = 600, h = 700;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  const popup = window.open(url, 'cloudflare-oauth', `width=${w},height=${h},left=${left},top=${top},popup=yes`);

  const handler = async (event: MessageEvent) => {
    if (!event.data?.type || event.data.type !== 'cloudflare-oauth-callback') return;
    window.removeEventListener('message', handler);
    popup?.close();
    try {
      const result = await sdk.domains.completeCloudflareOAuth(event.data.code, state, projectId) as { connection: DnsConnection };
      const updated = await sdk.domains.list(projectId);
      callbacks.onSuccess(result.connection, updated ?? []);
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error('OAuth failed'));
    }
  };
  window.addEventListener('message', handler);
}
