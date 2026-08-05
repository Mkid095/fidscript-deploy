'use client';

import { AccountSettings } from './account-settings';
import { SecuritySettings } from './security-settings';
import { NotificationSettings } from './notification-settings';
import { useSettingsPage } from './settings-page-hooks';

export default function SettingsPage() {
  const {
    revoking,
    revokeError,
    testingId,
    deletingId,
    channelError,
    handleRevoke,
    handleTestChannel,
    handleDeleteChannel,
    handleAddChannel,
  } = useSettingsPage();

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
