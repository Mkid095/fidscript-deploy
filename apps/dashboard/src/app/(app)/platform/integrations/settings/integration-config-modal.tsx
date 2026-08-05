'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CloudIcon, CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { Card, Spinner } from '@fidscript/ui';
import { useIntegrationConfig } from './integration-config-modal-hooks';
import { CloudflareOAuthForm } from './cloudflare-oauth-form';
import { MoreIntegrationsCard } from './more-integrations-card';

export function IntegrationConfigModal() {
  const {
    oauthStatus, loadingStatus, statusError,
    clientId, setClientId, clientSecret, setClientSecret,
    saving, saveError, saveSuccess, testing, testResult,
    handleTest, handleSave, handleDisable,
  } = useIntegrationConfig();

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
