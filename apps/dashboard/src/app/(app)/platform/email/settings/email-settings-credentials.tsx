'use client';

import type { ChangeEvent } from 'react';
import { Input } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import type { StorageBackend } from '@fidscript-deploy/sdk';

interface CredentialsPanelProps {
  selectedProvider: StorageBackend;
  cloudName: string; setCloudName: (v: string) => void;
  apiKey: string; setApiKey: (v: string) => void;
  apiSecret: string; setApiSecret: (v: string) => void;
  showCloudinarySecret: boolean;
  setShowCloudinarySecret: (v: boolean | ((prev: boolean) => boolean)) => void;
  botToken: string; setBotToken: (v: string) => void;
  chatId: string; setChatId: (v: string) => void;
  showBotToken: boolean;
  setShowBotToken: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export function CredentialsPanel({
  selectedProvider,
  cloudName, setCloudName,
  apiKey, setApiKey,
  apiSecret, setApiSecret, showCloudinarySecret, setShowCloudinarySecret,
  botToken, setBotToken, chatId, setChatId, showBotToken, setShowBotToken,
}: CredentialsPanelProps) {
  if (selectedProvider === 'cloudinary') {
    return (
      <div className="border border-[var(--rail)] rounded-lg p-4 mb-6 bg-[var(--surface-2)] space-y-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Cloudinary Credentials</h3>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Cloud Name</label>
          <Input value={cloudName} onChange={(e: ChangeEvent<HTMLInputElement>) => setCloudName(e.target.value)} placeholder="my-cloud"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">API Key</label>
          <Input value={apiKey} onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)} placeholder="123456789012345"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">API Secret</label>
          <div className="relative">
            <Input type={showCloudinarySecret ? 'text' : 'password'} value={apiSecret} onChange={(e: ChangeEvent<HTMLInputElement>) => setApiSecret(e.target.value)} placeholder=".............."
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full pr-10" />
            <button type="button" onClick={() => setShowCloudinarySecret(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]">
              <HugeiconsIcon icon={showCloudinarySecret ? ViewOffIcon : ViewIcon} size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedProvider === 'telegram') {
    return (
      <div className="border border-[var(--rail)] rounded-lg p-4 mb-6 bg-[var(--surface-2)] space-y-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Telegram Bot Credentials</h3>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Bot Token</label>
          <div className="relative">
            <Input type={showBotToken ? 'text' : 'password'} value={botToken} onChange={(e: ChangeEvent<HTMLInputElement>) => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full pr-10" />
            <button type="button" onClick={() => setShowBotToken(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]">
              <HugeiconsIcon icon={showBotToken ? ViewOffIcon : ViewIcon} size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Chat / Channel ID</label>
          <Input value={chatId} onChange={(e: ChangeEvent<HTMLInputElement>) => setChatId(e.target.value)} placeholder="-1001234567890"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
        </div>
      </div>
    );
  }

  return null;
}
