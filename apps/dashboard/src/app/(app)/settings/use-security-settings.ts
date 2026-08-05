'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

export function useSecuritySettings() {
  const { getSdk } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

  useEffect(() => {
    async function loadKeys() {
      setLoadingKeys(true);
      try {
        const sdk = getSdk();
        const { projects } = await sdk.projects.list();
        if (projects.length === 0) { setLoadingKeys(false); return; }
        const keys = await sdk.projects.listApiKeys(projects[0].id);
        setApiKeys(keys);
      } catch { /* API keys may not be available */ }
      finally { setLoadingKeys(false); }
    }
    loadKeys();
  }, [getSdk]);

  return { apiKeys, loadingKeys };
}
