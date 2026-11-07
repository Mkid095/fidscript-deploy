'use client';

import { useState } from 'react';

interface ConfigureBody {
  platformName: string;
  platformDomain: string;
  serverIp: string;
  adminEmail: string;
  authMethod: string;
  adminPassword?: string;
  setupPassword?: string;
  cloudflareApiToken?: string;
  cloudflareClientId?: string;
  cloudflareClientSecret?: string;
}

interface UseConfigureSubmitOptions {
  onSuccess: (operationId: string, domain: string) => void;
  onError: (message: string) => void;
}

export function useConfigureSubmit({ onSuccess, onError }: UseConfigureSubmitOptions) {
  const [submitting, setSubmitting] = useState(false);

  async function submit(body: ConfigureBody, setupToken: string) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/installation/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The setup routes open the platform — its administrator, its routing
          // and its DNS credentials — so they need the token the installer
          // printed.
          'x-setup-token': setupToken,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Configuration failed' }));
        onError(err.message);
        return;
      }
      const { operationId } = await res.json();
      onSuccess(operationId, body.platformDomain);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Configuration request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, submit };
}
