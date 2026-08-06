'use client';

import type { DnsConnection } from '@fidscript-deploy/sdk';

interface OAuthCallbackMessage {
  type: 'cloudflare-oauth-callback';
  success: boolean;
  // The OAuth authorization code. May arrive either at the top level (current
  // popup contract) or nested inside `connection` (legacy/early contract).
  code?: string;
  connection?: { code?: string } & DnsConnection;
  error?: string;
}

function extractCode(msg: OAuthCallbackMessage): string | undefined {
  if (typeof msg.code === 'string' && msg.code.length > 0) return msg.code;
  if (msg.connection && typeof msg.connection.code === 'string') return msg.connection.code;
  return undefined;
}

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
    const msg = event.data as OAuthCallbackMessage | undefined;
    if (!msg || msg.type !== 'cloudflare-oauth-callback') return;
    window.removeEventListener('message', handler);
    popup?.close();

    if (msg.success === false) {
      callbacks.onError(new Error(msg.error || 'OAuth failed'));
      return;
    }

    const code = extractCode(msg);
    if (!code) {
      callbacks.onError(new Error('OAuth callback missing authorization code'));
      return;
    }

    try {
      const result = await sdk.domains.completeCloudflareOAuth(code, state, projectId) as { connection: DnsConnection };
      const updated = await sdk.domains.list(projectId);
      callbacks.onSuccess(result.connection, updated ?? []);
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error('OAuth failed'));
    }
  };
  window.addEventListener('message', handler);
}
