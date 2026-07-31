'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudIcon, CheckmarkCircle01Icon, CancelCircleIcon, LockIcon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { Button, Card, Input, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { MoreIntegrationsCard } from './more-integrations-card';

function mask(str: string): string {
  if (!str || str.length < 8) return '••••••••';
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

export function IntegrationConfigModal() {
  const sdk = useAuth().getSdk();
  const [oauthStatus, setOauthStatus] = useState<{ enabled: boolean } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'valid' | 'invalid' | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await sdk.installation.getCloudflareOAuthStatus();
      setOauthStatus(data);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to load status');
    } finally {
      setLoadingStatus(false);
    }
  }, [sdk]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleTest(e: React.MouseEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const res = await sdk.installation.testCloudflareConnection(clientId.trim(), clientSecret.trim());
      setTestResult(res.valid ? 'valid' : 'invalid');
    } catch {
      setTestResult('invalid');
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      await sdk.installation.updateCloudflareOAuth({ clientId: clientId.trim() || undefined, clientSecret: clientSecret.trim() || undefined });
      await loadStatus();
      setClientId('');
      setClientSecret('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Disable Cloudflare OAuth?')) return;
    setSaving(true);
    setSaveError(null);
    try {
      await sdk.installation.updateCloudflareOAuth({ enabled: false });
      await loadStatus();
      setClientId('');
      setClientSecret('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Disable failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card padding="lg" className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={CloudIcon} size={16} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Cloudflare</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">OAuth-based DNS management for users</p>
            </div>
          </div>
          {loadingStatus ? (
            <Spinner size="sm" />
          ) : oauthStatus ? (
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              oauthStatus.enabled ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
            }`}>
              <HugeiconsIcon icon={oauthStatus.enabled ? CheckmarkCircle01Icon : CancelCircleIcon} size={11} />
              {oauthStatus.enabled ? 'Enabled' : 'Disabled'}
            </div>
          ) : null}
        </div>

        {statusError ? (
          <p className="text-xs text-[var(--danger)]">{statusError}</p>
        ) : (
          <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
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
                  onChange={e => { setClientId(e.target.value); setTestResult(null); }}
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
                    onChange={e => { setClientSecret(e.target.value); setTestResult(null); }}
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
                    <button type="button" onClick={handleTest} disabled={testing}
                      className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-slate-500 transition-colors disabled:opacity-50">
                      {testing ? 'Testing…' : testResult === 'valid' ? '✓ Valid' : testResult === 'invalid' ? '✗ Invalid' : 'Test Connection'}
                    </button>
                    {testResult === 'valid' && <span className="text-xs text-green-400">Credentials are valid</span>}
                    {testResult === 'invalid' && <span className="text-xs text-[var(--danger)]">Invalid credentials</span>}
                  </div>
                )}
              </div>
            </div>
            {saveError && <p className="text-sm text-[var(--danger)]">{saveError}</p>}
            {saveSuccess && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />Settings saved successfully
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" size="sm" disabled={saving || (!clientId.trim() && !clientSecret.trim())} className="min-w-[100px]">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {oauthStatus?.enabled && (
                <button type="button" onClick={handleDisable} disabled={saving}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors disabled:opacity-50">
                  Disable OAuth
                </button>
              )}
            </div>
          </form>
        )}
      </Card>

      <MoreIntegrationsCard />
    </>
  );
}
