'use client';

import { Card, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { InboxIcon, LockIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import { useEmailSettings } from './use-email-settings';
import { EmailSettingsForm } from './email-settings-form';
import { EmailConnectionCard } from './email-connection-card';

export default function EmailAttachmentSettingsPage() {
  const { getSdk } = useAuth();
  const sdk = getSdk();

  const {
    config, loadingConfig, configError,
    selectedProvider, setSelectedProvider,
    saving, saveError, saveSuccess,
    cloudName, setCloudName,
    apiKey, setApiKey,
    apiSecret, setApiSecret,
    showCloudinarySecret, setShowCloudinarySecret,
    botToken, setBotToken,
    chatId, setChatId,
    showBotToken, setShowBotToken,
    testing, testResult,
    handleSave, handleTest, loadConfig,
  } = useEmailSettings({ sdk });

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">Attachment Storage</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Choose where email attachment bytes are stored. Applies to all inbound and outbound mail on the platform.
        </p>
      </div>

      {configError && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-3 text-sm text-[var(--danger)]">
          {configError}{' '}
          <button className="underline ml-2" onClick={loadConfig}>Retry</button>
        </div>
      )}

      {/* Current status banner */}
      {config && (
        <div className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-4 py-3">
          <span className="text-lg">{selectedProvider === 'internal' ? '💾' : selectedProvider === 'cloudinary' ? '☁️' : '✈️'}</span>
          <div className="flex-1">
            <span className="text-sm text-[var(--text-muted)]">Currently active: </span>
            <span className="text-sm font-medium text-[var(--text)]">{selectedProvider}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.hasCredentials ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
            {config.hasCredentials ? 'credentials set' : 'no credentials'}
          </span>
        </div>
      )}

      <EmailSettingsForm
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        testResult={testResult}
        testing={testing}
        cloudName={cloudName}
        setCloudName={setCloudName}
        apiKey={apiKey}
        setApiKey={setApiKey}
        apiSecret={apiSecret}
        setApiSecret={setApiSecret}
        showCloudinarySecret={showCloudinarySecret}
        setShowCloudinarySecret={setShowCloudinarySecret}
        botToken={botToken}
        setBotToken={setBotToken}
        chatId={chatId}
        setChatId={setChatId}
        showBotToken={showBotToken}
        setShowBotToken={setShowBotToken}
        onSave={handleSave}
        onTest={handleTest}
      />

      <EmailConnectionCard sdk={sdk} />

      {/* Info card */}
      <Card className="border border-[var(--rail)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">How it works</h3>
        <ul className="text-xs text-[var(--text-muted)] space-y-1.5">
          <li><HugeiconsIcon icon={InboxIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Inbound</strong> — When an email with attachments arrives, the system automatically downloads each attachment from Stalwart JMAP and uploads it to the configured storage.</li>
          <li><HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Already stored</strong> — Existing stored attachments are not moved when you switch backends.</li>
          <li><HugeiconsIcon icon={LockIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Credentials</strong> — Stored encrypted (AES-256-GCM) in the database and never exposed via the API.</li>
        </ul>
      </Card>
    </div>
  );
}
