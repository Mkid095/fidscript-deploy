'use client';

import { Input } from '@fidscript/ui';

interface CloudflareOAuthSectionProps {
  cloudflareClientId: string;
  cloudflareClientSecret: string;
  derivedRedirectUri: string;
  testingConnection: boolean;
  connectionTestResult: 'valid' | 'invalid' | null;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onTestConnection: () => void;
}

export function CloudflareOAuthSection({
  cloudflareClientId,
  cloudflareClientSecret,
  derivedRedirectUri,
  testingConnection,
  connectionTestResult,
  onClientIdChange,
  onClientSecretChange,
  onTestConnection,
}: CloudflareOAuthSectionProps) {
  return (
    <div className="border-t border-[var(--rail)] pt-4 mt-2">
      <p className="text-xs font-semibold text-[var(--text)] mb-3">Cloudflare OAuth (Optional)</p>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        Enable OAuth-based Cloudflare connection. Users will see a &quot;Connect with Cloudflare&quot; button
        in the domain wizard — no token needed per user.
      </p>
      <Input
        label="Cloudflare Client ID"
        type="text"
        value={cloudflareClientId}
        onChange={e => onClientIdChange(e.target.value)}
        placeholder="e.g. 4bc8f2a9b3c7d6e1..."
        hint="From dash.cloudflare.com → Overview → Get your API token → OAuth"
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] mb-3"
      />
      <Input
        label="Cloudflare Client Secret"
        type="password"
        value={cloudflareClientSecret}
        onChange={e => onClientSecretChange(e.target.value)}
        placeholder="OAuth client secret"
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] mb-3"
      />
      {derivedRedirectUri && (
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">OAuth Redirect URI</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text-muted)] rounded px-2 py-1.5 font-mono break-all">
              {derivedRedirectUri}
            </code>
            <span className="shrink-0 text-xs text-[var(--text-dim)]">auto-derived</span>
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Add this URI to your Cloudflare OAuth app&apos;s redirect list in the Cloudflare dashboard.
          </p>
        </div>
      )}
      {cloudflareClientId.trim() && cloudflareClientSecret.trim() && (
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={onTestConnection}
            disabled={testingConnection}
            className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-slate-500 transition-colors disabled:opacity-50"
          >
            {testingConnection ? 'Testing…' : connectionTestResult === 'valid' ? '✓ Valid' : connectionTestResult === 'invalid' ? '✗ Invalid' : 'Test Connection'}
          </button>
          {connectionTestResult === 'valid' && (
            <span className="text-xs text-green-400">Credentials are valid</span>
          )}
          {connectionTestResult === 'invalid' && (
            <span className="text-xs text-[var(--danger)]">Invalid credentials</span>
          )}
        </div>
      )}
    </div>
  );
}
