'use client';

import { useState } from 'react';
import { Button, Card, Input, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useNotificationSettings } from './notification-settings-hooks';
import type { NotificationChannel } from '@/types';

interface NotificationSettingsProps {
  onTest: (channelId: string) => void;
  onDelete: (channelId: string) => void;
  onAdd: (name: string, type: 'email' | 'slack', config: Record<string, string>) => void;
  testingId: string | null;
  deletingId: string | null;
  channelError: string | null;
}

export function NotificationSettings({ onTest, onDelete, testingId, deletingId, channelError, onAdd }: NotificationSettingsProps) {
  const { getSdk } = useAuth();
  const { channels, loadingChannels } = useNotificationSettings({ getSdk });
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [channelType, setChannelType] = useState<'email' | 'slack'>('email');
  const [channelName, setChannelName] = useState('');
  const [channelValue, setChannelValue] = useState('');

  function handleAddChannel() {
    if (!channelName.trim() || !channelValue.trim()) return;
    const config: Record<string, string> = channelType === 'email'
      ? { email: channelValue.trim(), webhook_url: '' }
      : { email: '', webhook_url: channelValue.trim() };
    onAdd(channelName.trim(), channelType, config);
    setChannelName('');
    setChannelValue('');
    setShowAddChannel(false);
  }

  return (
    <Card className="border border-[var(--rail)] mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Notification Channels</h2>
        <Button variant="secondary" size="sm" onClick={() => setShowAddChannel(true)}>Add Channel</Button>
      </div>
      {loadingChannels ? (
        <Spinner size="md" />
      ) : channels.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No notification channels configured.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
              <div>
                <p className="text-sm text-[var(--text)]">{ch.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{ch.type === 'email' ? ch.config.email : ch.config.webhook_url}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" loading={testingId === ch.id} onClick={() => onTest(ch.id)}>Test</Button>
                <Button variant="danger" size="sm" loading={deletingId === ch.id} onClick={() => onDelete(ch.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {channelError && <p className="text-[var(--danger)] text-xs mt-3">{channelError}</p>}

      {showAddChannel && (
        <div className="mt-4 pt-4 border-t border-[var(--rail)]">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Add Notification Channel</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
              <select value={channelType} onChange={e => setChannelType(e.target.value as 'email' | 'slack')}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
                <option value="email">Email</option>
                <option value="slack">Slack Webhook</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Name</label>
              <Input value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="e.g. On-call team"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{channelType === 'email' ? 'Email Address' : 'Webhook URL'}</label>
              <Input value={channelValue} onChange={e => setChannelValue(e.target.value)}
                placeholder={channelType === 'email' ? 'team@example.com' : 'https://hooks.slack.com/...'}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddChannel(false); setChannelName(''); setChannelValue(''); }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddChannel}>Add Channel</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
