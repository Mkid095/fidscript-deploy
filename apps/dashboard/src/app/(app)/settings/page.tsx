'use client';

import { PageHeader } from '@fidscript/ui';
import { AccountSettings } from './account-settings';
import { PlatformSettings } from './platform-settings';
import { SecuritySettings } from './security-settings';
import { MfaSettings } from './mfa-settings';
import { SessionSettings } from './session-settings';
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
      <PageHeader
        title="Settings"
        description="Your account, your credentials and this platform's own surfaces."
      />
      <PlatformSettings />
      <AccountSettings />
      <MfaSettings />
      <NotificationSettings onTest={handleTestChannel} onDelete={handleDeleteChannel} onAdd={handleAddChannel}
        testingId={testingId} deletingId={deletingId} channelError={channelError} />
      <SecuritySettings onRevoke={handleRevoke} revoking={revoking} revokeError={revokeError} />
      <SessionSettings />
    </div>
  );
}
