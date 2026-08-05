'use client';

import { Button, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import type { StorageBackend } from '@fidscript-deploy/sdk';
import { BACKEND_INFO } from './email-settings-hooks';
import { CredentialsPanel } from './email-settings-credentials';

export interface Props {
  selectedProvider: StorageBackend;
  setSelectedProvider: (v: StorageBackend) => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  testResult: { ok: boolean; message: string } | null;
  testing: boolean;
  cloudName: string; setCloudName: (v: string) => void;
  apiKey: string; setApiKey: (v: string) => void;
  apiSecret: string; setApiSecret: (v: string) => void;
  showCloudinarySecret: boolean;
  setShowCloudinarySecret: (v: boolean | ((prev: boolean) => boolean)) => void;
  botToken: string; setBotToken: (v: string) => void;
  chatId: string; setChatId: (v: string) => void;
  showBotToken: boolean;
  setShowBotToken: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSave: (e: React.FormEvent) => void;
  onTest: () => void;
}

export function EmailSettingsForm({
  selectedProvider, setSelectedProvider,
  cloudName, setCloudName,
  apiKey, setApiKey,
  apiSecret, setApiSecret, showCloudinarySecret, setShowCloudinarySecret,
  botToken, setBotToken, chatId, setChatId, showBotToken, setShowBotToken,
  saving, saveError, saveSuccess, testResult, testing,
  onSave, onTest,
}: Props) {
  const isDisabled =
    (selectedProvider === 'cloudinary' && (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim())) ||
    (selectedProvider === 'telegram' && (!botToken.trim() || !chatId.trim()));

  const resetToInternal = () => {
    setSelectedProvider('internal');
    setCloudName(''); setApiKey(''); setApiSecret('');
    setBotToken(''); setChatId('');
  };

  return (
    <Card className="border border-[var(--rail)] p-5">
      <form onSubmit={onSave} noValidate>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Storage Backend</h2>
        <div className="space-y-3 mb-6">
          {(Object.keys(BACKEND_INFO) as StorageBackend[]).map(key => {
            const info = BACKEND_INFO[key];
            const isSelected = selectedProvider === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedProvider(key)}
                className={`w-full text-left rounded-lg border p-4 transition-all ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-slate-500'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                      <span>{info.icon}</span>
                      {info.label}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{info.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <CredentialsPanel
          selectedProvider={selectedProvider}
          cloudName={cloudName} setCloudName={setCloudName}
          apiKey={apiKey} setApiKey={setApiKey}
          apiSecret={apiSecret} setApiSecret={setApiSecret}
          showCloudinarySecret={showCloudinarySecret}
          setShowCloudinarySecret={setShowCloudinarySecret}
          botToken={botToken} setBotToken={setBotToken}
          chatId={chatId} setChatId={setChatId}
          showBotToken={showBotToken}
          setShowBotToken={setShowBotToken}
        />

        <div className="mb-6">
          <Button type="button" variant="ghost" size="sm" loading={testing} onClick={onTest} disabled={isDisabled}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          {testResult && (
            <p className={`text-xs mt-2 ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {testResult.ok ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={CancelCircleIcon} size={14} strokeWidth={1.5} />}
              {' '}{testResult.message}
            </p>
          )}
        </div>
        {saveError && <div className="mb-3 text-[var(--danger)] text-xs">{saveError}</div>}
        {saveSuccess && <div className="mb-3 text-[var(--success)] text-xs"> Settings saved successfully.</div>}
        <div className="flex gap-3">
          <Button variant="primary" size="sm" type="submit" loading={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {selectedProvider !== 'internal' && (
            <Button type="button" variant="ghost" size="sm" onClick={resetToInternal}>
              Reset to Internal
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
