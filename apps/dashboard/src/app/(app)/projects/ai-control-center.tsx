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

function friendlyError(msg: string | null): string {
  if (!msg) return '';
  if (msg.toLowerCase().includes('bad request')) return 'We could not create the API key. Please check your input and try again.';
  if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('401')) return 'Your session has expired. Please sign in again.';
  if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('403')) return "You don't have permission to perform this action.";
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) return 'Unable to connect to FIDScript. Check your connection and try again.';
  return msg;
}

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
        aria-label="Key name"
        className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)]" />
      <ExpirySelector value={expiry} onChange={setExpiry} />
      <button type="submit" disabled={!name.trim() || creating}
        className="bg-[var(--primary)] text-white text-sm rounded-lg px-3 py-2 disabled:opacity-50">
        {creating ? 'Creating…' : 'Create API Key'}
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
    <details className="border border-[var(--rail)] rounded-lg bg-[var(--surface)] mt-8">
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none">
        <HugeiconsIcon icon={Key01Icon} size={16} className="text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text)]">Developer & AI Access</span>
        {selectedKey && <KeyBadge keyItem={selectedKey} />}
      </summary>
      <div className="px-4 pb-5 space-y-5">
        <p className="text-xs text-[var(--text-muted)]">
          API keys allow external tools — AI coding agents, CLI, MCP, and SDK — to securely access your FIDScript account.
          Create a key below and use it to connect your tools.
        </p>
        {(error || localError) && (
          <p className="text-xs text-[var(--error)]">
            {friendlyError(error || localError)}
          </p>
        )}
        <AiKeyCreateForm onCreate={handleCreate} />
        {showKey && <ShowKeyBanner raw={showKey} onDismiss={clearShowKey} />}
        {keys.length > 0 && (
          <>
            <KeySelector keys={keys} selectedKey={selectedKey} onSelect={setSelectedKey} onRevoke={revokeKey} />
            <div className="flex flex-wrap gap-2 text-xs text-[var(--text-dim)]">
              <span>Use with:</span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)]">CLI</span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)]">MCP</span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)]">SDK</span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)]">AI Agents</span>
            </div>
          </>
        )}
        {selectedKey && <AiPromptPanel prompt={aiPrompt} />}
        {mcpConfig && <ConfigPanel label="MCP Configuration" content={mcpConfig} />}
        {cliCmd && <CliPanel cmd={cliCmd} />}
        {sdkCode && <SdkPanel code={sdkCode} />}
      </div>
    </details>
  );
}
