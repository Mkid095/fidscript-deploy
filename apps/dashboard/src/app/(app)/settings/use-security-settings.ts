'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  keyPreview?: string;
}

export function useSecuritySettings() {
  const { getSdk } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  // Bumped to ask for the list again — a revoked key that is still on the
  // screen is a key the page says exists and the platform has thrown away.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    async function loadKeys() {
      setLoadingKeys(true);
      try {
        const sdk = getSdk();
        // The account's own keys. It used to list the FIRST PROJECT's keys
        // here, so somebody with two projects saw one project's keys under
        // "API Keys" in their account settings, and revoked the wrong one.
        const { apiKeys: keys } = await sdk.auth.apiKeys();
        setApiKeys(keys);
      } catch { /* API keys may not be available */ }
      finally { setLoadingKeys(false); }
    }
    loadKeys();
  }, [getSdk, reloadToken]);

  return { apiKeys, loadingKeys, reload: () => setReloadToken((n) => n + 1) };
}
