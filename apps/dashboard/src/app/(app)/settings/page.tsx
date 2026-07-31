'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AccountSettings } from './account-settings';
import { SecuritySettings } from './security-settings';
import { NotificationSettings } from './notification-settings';

export default function SettingsPage() {
  const { getSdk } = useAuth();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
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
  }

  async function handleTestChannel(channelId: string) {
    setTestingId(channelId);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length > 0) await sdk.monitoring.testNotificationChannel(projects[0].id, channelId);
      alert('Test notification sent!');
    } catch (err) {
      alert(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTestingId(null);
    }
  }

  async function handleDeleteChannel(channelId: string) {
    if (!confirm('Delete this notification channel?')) return;
    setDeletingId(channelId);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length > 0) await sdk.monitoring.deleteNotificationChannel(projects[0].id, channelId);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddChannel(name: string, type: 'email' | 'slack', config: Record<string, string>) {
    setChannelError(null);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length === 0) return;
      await sdk.monitoring.createNotificationChannel(projects[0].id, name, type, config);
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Failed to add channel');
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[var(--text)] mb-6">Settings</h1>
      <AccountSettings />
      <NotificationSettings onTest={handleTestChannel} onDelete={handleDeleteChannel} onAdd={handleAddChannel}
        testingId={testingId} deletingId={deletingId} channelError={channelError} />
      <SecuritySettings onRevoke={handleRevoke} revoking={revoking} revokeError={revokeError} />
    </div>
  );
}
