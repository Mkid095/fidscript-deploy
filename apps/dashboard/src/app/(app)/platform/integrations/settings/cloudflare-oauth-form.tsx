'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, LockIcon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { Button, Input } from '@fidscript/ui';

interface CloudflareOAuthFormProps {
  clientId: string;
  clientSecret: string;
  oauthStatus: { enabled: boolean } | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  testing: boolean;
  testResult: 'valid' | 'invalid' | null;
  onClientIdChange: (v: string) => void;
  onClientSecretChange: (v: string) => void;
  onTest: () => void;
  onSave: () => void;
  onDisable: () => void;
}

export function CloudflareOAuthForm({
  clientId, clientSecret, oauthStatus, saving, saveError, saveSuccess, testing, testResult,
  onClientIdChange, onClientSecretChange, onTest, onSave, onDisable,
}: CloudflareOAuthFormProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="border-t border-[var(--rail)] pt-4">
      <p className="text-xs text-[var(--text-muted)] mb-3">
        Enter your Cloudflare OAuth app credentials. Users see a "Connect with Cloudflare" button in the domain wizard.
        <br />
        <span className="text-[var(--text-dim)]">
          Create an OAuth app at{' '}
          <a href="https://dash.cloudflare.com/my-profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">dash.cloudflare.com → My Profile → API Tokens</a>
        </span>
      </p>
      <div className="flex flex-col gap-3">
        <Input label="Client ID" type="text" value={clientId}
          onChange={e => { onClientIdChange(e.target.value); }}
          placeholder="e.g. 4bc8f2a9b3c7d6e1..."
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-[var(--text-muted)]">Client Secret</label>
            <button type="button" onClick={() => setShowSecret(v => !v)}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] flex items-center gap-1">
              <HugeiconsIcon icon={showSecret ? ViewIcon : ViewOffIcon} size={11} />
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </div>
          <Input type={showSecret ? 'text' : 'password'} value={clientSecret}
            onChange={e => { onClientSecretChange(e.target.value); }}
            placeholder="OAuth client secret"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
        </div>

        {oauthStatus?.enabled && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-xs text-[var(--text-muted)]">
            <HugeiconsIcon icon={LockIcon} size={12} className="shrink-0" />
            <span>OAuth is <span className="text-green-400 font-medium">enabled</span>. Users see the Cloudflare button. Enter new values above to change credentials.</span>
          </div>
        )}

        {clientId.trim() && clientSecret.trim() && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={onTest} disabled={testing}
              className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-slate-500 transition-colors disabled:opacity-50">
              {testing ? 'Testing…' : testResult === 'valid' ? '✓ Valid' : testResult === 'invalid' ? '✗ Invalid' : 'Test Connection'}
            </button>
            {testResult === 'valid' && <span className="text-xs text-green-400">Credentials are valid</span>}
            {testResult === 'invalid' && <span className="text-xs text-[var(--danger)]">Invalid credentials</span>}
          </div>
        )}
      </div>
      {saveError && <p className="text-sm text-[var(--danger)] mt-3">{saveError}</p>}
      {saveSuccess && (
        <div className="flex items-center gap-2 text-xs text-green-400 mt-3">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />Settings saved successfully
        </div>
      )}
      <div className="flex items-center gap-3 pt-3">
        <Button type="button" variant="primary" size="sm" disabled={saving || (!clientId.trim() && !clientSecret.trim())} onClick={onSave} className="min-w-[100px]">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {oauthStatus?.enabled && (
          <button type="button" onClick={onDisable} disabled={saving}
            className="text-xs text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors disabled:opacity-50">
            Disable OAuth
          </button>
        )}
      </div>
    </div>
  );
}
