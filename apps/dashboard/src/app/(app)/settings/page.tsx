'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { NotificationChannel } from '@/types';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, getSdk } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [channelType, setChannelType] = useState<'email' | 'slack'>('email');
  const [channelName, setChannelName] = useState('');
  const [channelValue, setChannelValue] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadKeys() {
      setLoadingKeys(true);
      try {
        const sdk = getSdk();
        const { projects } = await sdk.projects.list();
        if (projects.length === 0) { setLoadingKeys(false); return; }
        const keys = await sdk.projects.listApiKeys(projects[0].id);
        setApiKeys(keys);
      } catch {
        // API keys may not be available in this context
      } finally {
        setLoadingKeys(false);
      }
    }
    loadKeys();
  }, [getSdk]);

  useEffect(() => {
    async function loadChannels() {
      setLoadingChannels(true);
      try {
        const sdk = getSdk();
        const { projects } = await sdk.projects.list();
        if (projects.length === 0) { setLoadingChannels(false); return; }
        const ch = await sdk.monitoring.listNotificationChannels(projects[0].id);
        setChannels(ch);
      } catch {
        // channels may not be available
      } finally {
        setLoadingChannels(false);
      }
    }
    loadChannels();
  }, [getSdk]);

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    setRevoking(keyId);
    setRevokeError(null);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length > 0) {
        await sdk.projects.revokeApiKey(projects[0].id, keyId);
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
      }
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Permanently delete your account? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All your projects, data, and deployments will be deleted.')) return;
    alert('Please contact support to delete your account.');
  }

  async function handleAddChannel() {
    if (!channelName.trim() || !channelValue.trim()) return;
    setAddingChannel(true);
    setChannelError(null);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length === 0) return;
      const config: Record<string, string> =
        channelType === 'email'
          ? { email: channelValue.trim(), webhook_url: '' }
          : { email: '', webhook_url: channelValue.trim() };
      const ch = await sdk.monitoring.createNotificationChannel(
        projects[0].id,
        channelName.trim(),
        channelType,
        config,
      );
      setChannels(prev => [...prev, ch]);
      setChannelName('');
      setChannelValue('');
      setShowAddChannel(false);
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Failed to add channel');
    } finally {
      setAddingChannel(false);
    }
  }

  async function handleTestChannel(channelId: string) {
    setTestingId(channelId);
    try {
      const sdk = getSdk();
      const { projects } = await sdk.projects.list();
      if (projects.length === 0) return;
      await sdk.monitoring.testNotificationChannel(projects[0].id, channelId);
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
      if (projects.length === 0) return;
      await sdk.monitoring.deleteNotificationChannel(projects[0].id, channelId);
      setChannels(prev => prev.filter(c => c.id !== channelId));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-200 mb-6">Settings</h1>

      {/* Profile */}
      <Card className="border border-[#1e2130] mb-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Profile</h2>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-200">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Name</p>
            <p className="text-sm text-slate-200">{user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Role</p>
            <p className="text-sm text-slate-200 capitalize">{user?.role ?? '—'}</p>
          </div>
        </div>
      </Card>

      {/* Notification Channels */}
      <Card className="border border-[#1e2130] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Notification Channels</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowAddChannel(true)}>
            Add Channel
          </Button>
        </div>

        {loadingChannels ? (
          <Spinner size="md" />
        ) : channels.length === 0 ? (
          <p className="text-sm text-slate-500">No notification channels configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {channels.map(ch => (
              <div
                key={ch.id}
                className="flex items-center justify-between px-3 py-2.5 bg-[#080a0d] border border-[#1e2130] rounded-md"
              >
                <div>
                  <p className="text-sm text-slate-200">{ch.name}</p>
                  <p className="text-xs text-slate-500">
                    {ch.type === 'email' ? ch.config.email : ch.config.webhook_url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={testingId === ch.id}
                    onClick={() => handleTestChannel(ch.id)}
                  >
                    Test
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === ch.id}
                    onClick={() => handleDeleteChannel(ch.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {channelError && <p className="text-red-400 text-xs mt-3">{channelError}</p>}
      </Card>

      {/* Add Channel Form */}
      {showAddChannel && (
        <Card className="border border-[#1e2130] mb-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Add Notification Channel</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={channelType}
                onChange={e => setChannelType(e.target.value as 'email' | 'slack')}
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="email">Email</option>
                <option value="slack">Slack Webhook</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <Input
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                placeholder="e.g. On-call team"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {channelType === 'email' ? 'Email Address' : 'Webhook URL'}
              </label>
              <Input
                value={channelValue}
                onChange={e => setChannelValue(e.target.value)}
                placeholder={channelType === 'email' ? 'team@example.com' : 'https://hooks.slack.com/...'}
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddChannel(false); setChannelName(''); setChannelValue(''); setChannelError(null); }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={addingChannel} onClick={handleAddChannel}>
                Add Channel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys */}
      <Card className="border border-[#1e2130] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">API Keys</h2>
        </div>

        {loadingKeys ? (
          <Spinner size="md" />
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-slate-500">No API keys created yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeys.map(key => (
              <div
                key={key.id}
                className="flex items-center justify-between px-3 py-2.5 bg-[#080a0d] border border-[#1e2130] rounded-md"
              >
                <div>
                  <p className="text-sm text-slate-200">{key.name}</p>
                  <p className="text-xs text-slate-500">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={revoking === key.id}
                  onClick={() => handleRevoke(key.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}

        {revokeError && <p className="text-red-400 text-xs mt-3">{revokeError}</p>}
      </Card>

      {/* Danger Zone */}
      <Card className="border border-red-500/50">
        <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">Delete Account</p>
            <p className="text-xs text-slate-500">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
