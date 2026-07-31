'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudIcon, CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { Button, Card, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { CloudflareOAuthForm } from './cloudflare-oauth-form';
import { MoreIntegrationsCard } from './more-integrations-card';

export function IntegrationConfigModal() {
  const sdk = useAuth().getSdk();
  const [oauthStatus, setOauthStatus] = useState<{ enabled: boolean } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
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

  async function handleTest() {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const res = await sdk.installation.testCloudflareConnection(clientId.trim(), clientSecret.trim());
      setTestResult(res.valid ? 'valid' : 'invalid');
    } catch { setTestResult('invalid'); }
    finally { setTesting(false); }
  }

  async function handleSave() {
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
    } finally { setSaving(false); }
  }

  async function handleDisable() {
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
    } finally { setSaving(false); }
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
          <CloudflareOAuthForm
            clientId={clientId} clientSecret={clientSecret}
            oauthStatus={oauthStatus}
            saving={saving} saveError={saveError} saveSuccess={saveSuccess}
            testing={testing} testResult={testResult}
            onClientIdChange={v => { setClientId(v); }}
            onClientSecretChange={v => { setClientSecret(v); }}
            onTest={handleTest}
            onSave={handleSave}
            onDisable={handleDisable}
          />
        )}
      </Card>

      <MoreIntegrationsCard />
    </>
  );
}
