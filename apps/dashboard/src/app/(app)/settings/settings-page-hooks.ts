'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { useConfirm } from '@/components/ui/confirm-provider';

export interface UseSettingsPageReturn {
  revoking: string | null;
  revokeError: string | null;
  testingId: string | null;
  deletingId: string | null;
  channelError: string | null;
  handleRevoke: (keyId: string) => Promise<void>;
  handleTestChannel: (channelId: string) => Promise<void>;
  handleDeleteChannel: (channelId: string) => Promise<void>;
  handleAddChannel: (name: string, type: 'email' | 'slack', config: Record<string, string>) => Promise<void>;
}

export function useSettingsPage(): UseSettingsPageReturn {
  const { getSdk } = useAuth();
  const confirmFn = useConfirm();
  const { showToast } = useToast();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);

  const handleRevoke = useCallback(async (keyId: string) => {
    const ok = await confirmFn({
      title: 'Revoke API key',
      message: 'Revoke this API key? This cannot be undone.',
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (!ok) return;
    setRevoking(keyId);
    setRevokeError(null);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length > 0) await sdk.projects.revokeApiKey(projects[0].id, keyId);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }, [getSdk]);

  const handleTestChannel = useCallback(async (channelId: string) => {
    setTestingId(channelId);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length > 0) await sdk.monitoring.testNotificationChannel(projects[0].id, channelId);
      showToast({ type: 'success', message: 'Test notification sent!' });
    } catch (err) {
      showToast({ type: 'error', message: `Test failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setTestingId(null);
    }
  }, [getSdk, showToast]);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    const ok = await confirmFn({
      title: 'Delete channel',
      message: 'Delete this notification channel?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(channelId);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length > 0) await sdk.monitoring.deleteNotificationChannel(projects[0].id, channelId);
    } finally {
      setDeletingId(null);
    }
  }, [getSdk, confirmFn]);

  const handleAddChannel = useCallback(async (name: string, type: 'email' | 'slack', config: Record<string, string>) => {
    setChannelError(null);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length === 0) return;
      await sdk.monitoring.createNotificationChannel(projects[0].id, name, type, config);
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Failed to add channel');
    }
  }, [getSdk]);

  return {
    revoking,
    revokeError,
    testingId,
    deletingId,
    channelError,
    handleRevoke,
    handleTestChannel,
    handleDeleteChannel,
    handleAddChannel,
  };
}
