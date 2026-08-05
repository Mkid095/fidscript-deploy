import { useEffect, useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { NotificationChannel } from '@/types';

interface UseNotificationSettingsOptions {
  getSdk: () => FidscriptSDK;
}

export function useNotificationSettings({ getSdk }: UseNotificationSettingsOptions) {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length === 0) {
        setChannels([]);
        return;
      }
      const ch = await sdk.monitoring.listNotificationChannels(projects[0].id);
      setChannels(ch);
    } catch {
      /* channels may not be available */
    } finally {
      setLoadingChannels(false);
    }
  }, [getSdk]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return {
    channels,
    loadingChannels,
    loadChannels,
    setChannels,
  };
}
