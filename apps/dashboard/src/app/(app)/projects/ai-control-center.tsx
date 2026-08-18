'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Key01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import { useAccountCredentials } from '@/hooks/use-account-credentials';
import { getAiPrompt } from './ai-prompt-generator';
import { getMcpConfig, getCliLoginCommand, getSdkInitCode } from './ai-control-center-data';
import { ShowKeyBanner, KeySelector, AiPromptPanel, ConfigPanel, CliPanel, SdkPanel } from './ai-control-center-sections';
import { ExpirySelector } from './ai-expiry-selector';
import { KeyBadge } from './ai-key-badge';
import type { ExpiryOption } from '@/hooks/use-account-credentials';
import type { AccountKey } from './ai-prompt-generator';

function AiKeyCreateForm({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState<ExpiryOption>('30d');
  const [creating, setCreating] = useState(false);
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try { await onCreate(name.trim()); setName(''); } finally { setCreating(false); }
  }
  return (
    <form onSubmit={handleCreate} className="flex items-start gap-3">
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Key name (e.g. Claude Desktop)" maxLength={100}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)]" />
      <ExpirySelector value={expiry} onChange={setExpiry} />
      <button type="submit" disabled={!name.trim() || creating}
        className="bg-[var(--primary)] text-white text-sm rounded-lg px-3 py-2 disabled:opacity-50">
        {creating ? 'Creating…' : 'Generate'}
      </button>
    </form>
  );
}

export function AIControlCenter() {
  const { getSdk } = useAuth();
  const {
    keys, selectedKey, showKey, expiryOption, platformApiUrl,
    loading, error, createKey, revokeKey, setExpiryOption, setSelectedKey, clearShowKey,
  } = useAccountCredentials(getSdk);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const aiPrompt = selectedKey ? getAiPrompt(selectedKey, platformApiUrl) : '';
  const mcpConfig = selectedKey && showKey ? getMcpConfig(showKey, platformApiUrl) : '';
  const cliCmd   = selectedKey && showKey ? getCliLoginCommand(showKey) : '';
  const sdkCode  = selectedKey && showKey ? getSdkInitCode(showKey, platformApiUrl) : '';

  async function handleCreate(name: string) {
    setLocalError(null);
    setCreating(true);
    try { await createKey(name); setNewKeyName(''); }
    catch (err: any) { setLocalError(err?.message ?? 'Failed to create key'); }
    finally { setCreating(false); }
  }

  return (
    <details className="border border-[var(--rail)] rounded-lg bg-[var(--surface)] mb-6" open>
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none">
        <HugeiconsIcon icon={Key01Icon} size={16} className="text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text)]">AI Control Center</span>
        {selectedKey && <KeyBadge keyItem={selectedKey} />}
      </summary>
      <div className="px-4 pb-5 space-y-5">
        {(error || localError) && <p className="text-xs text-[var(--error)]">{error || localError}</p>}
        <AiKeyCreateForm onCreate={handleCreate} />
        {showKey && <ShowKeyBanner raw={showKey} onDismiss={clearShowKey} />}
        {keys.length > 0 && (
          <KeySelector keys={keys} selectedKey={selectedKey} onSelect={setSelectedKey} onRevoke={revokeKey} />
        )}
        {selectedKey && <AiPromptPanel prompt={aiPrompt} />}
        {mcpConfig && <ConfigPanel label="MCP Configuration" content={mcpConfig} />}
        {cliCmd && <CliPanel cmd={cliCmd} />}
        {sdkCode && <SdkPanel code={sdkCode} />}
      </div>
    </details>
  );
}
