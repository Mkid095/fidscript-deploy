import { useState, useCallback } from 'react';
import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';

interface UseMcpHubOptions {
  project: Project;
  showToast?: (opts: { type: 'success' | 'error'; message: string }) => void;
}

interface UseMcpHubReturn {
  apiKey: { id: string; key: string } | null;
  loading: boolean;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
  generateKey: () => Promise<void>;
}

export function useMcpHub({ project, showToast }: UseMcpHubOptions): UseMcpHubReturn {
  const { getSdk } = useAuth();
  const [apiKey, setApiKey] = useState<{ id: string; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const generateKey = useCallback(async () => {
    setLoading(true);
    try {
      const sdk = getSdk();
      const result = await sdk.projects.createApiKey(project.id, 'BaaS Key');
      setApiKey({ id: result.apiKey.id, key: result.key });
      setShowKey(true);
      showToast?.({ type: 'success', message: 'API key generated — copy it now, you won\'t see it again.' });
    } catch (err) {
      showToast?.({ type: 'error', message: err instanceof Error ? err.message : 'Failed to generate key' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  return { apiKey, loading, showKey, setShowKey, generateKey };
}
