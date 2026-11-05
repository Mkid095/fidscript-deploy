'use client';

import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { useDomainValidation } from '../hooks/use-domain-validation';
import { CloudflareOAuthSection } from './cloudflare-oauth-section';
import { CloudflareTokenField } from './cloudflare-token-field';
import { AdminEmailField } from './admin-email-field';
import { PasswordFields } from './password-fields';
import { CompanyPasswordFields } from './company-password-fields';
import { AuthMethodBadge } from './auth-method-badge';
import { PlatformNameField } from './platform-name-field';

type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

interface DomainStepProps {
  authMethod: AuthMethod;
  platformName: string;
  platformDomain: string;
  cloudflareToken: string;
  cloudflareClientId: string;
  cloudflareClientSecret: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  setupPassword: string;
  confirmSetupPassword: string;
  formError: string;
  onPlatformNameChange: (v: string) => void;
  onPlatformDomainChange: (v: string) => void;
  onCloudflareTokenChange: (v: string) => void;
  onCloudflareClientIdChange: (v: string) => void;
  onCloudflareClientSecretChange: (v: string) => void;
  onAdminEmailChange: (v: string) => void;
  onAdminPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onSetupPasswordChange: (v: string) => void;
  onConfirmSetupPasswordChange: (v: string) => void;
  onTestConnection: () => void;
  onSubmit: () => void;
  testingConnection: boolean;
  connectionTestResult: 'valid' | 'invalid' | null;
}

export function DomainStep({
  authMethod,
  platformName,
  platformDomain,
  cloudflareToken,
  cloudflareClientId,
  cloudflareClientSecret,
  adminEmail,
  adminPassword,
  confirmPassword,
  setupPassword,
  confirmSetupPassword,
  formError,
  onPlatformNameChange,
  onPlatformDomainChange,
  onCloudflareTokenChange,
  onCloudflareClientIdChange,
  onCloudflareClientSecretChange,
  onAdminEmailChange,
  onAdminPasswordChange,
  onConfirmPasswordChange,
  onSetupPasswordChange,
  onConfirmSetupPasswordChange,
  onTestConnection,
  onSubmit,
  testingConnection,
  connectionTestResult,
}: DomainStepProps) {
  const {domainError, validating} = useDomainValidation(platformDomain);
  const derivedRedirectUri = platformDomain
    ? `https://${platformDomain}/api/callback/cloudflare`
    : '';

  const canSubmit =
    platformDomain.trim() && !domainError &&
    adminEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) &&
    setupPassword.length >= 8 && setupPassword === confirmSetupPassword &&
    (authMethod === 'MAGIC_CODE' || (
      adminPassword.length >= 12 && adminPassword === confirmPassword
    ));

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs text-[var(--text-muted)]">← Back</span>
        <AuthMethodBadge method={authMethod} />
      </div>

      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Platform Details</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {authMethod === 'MAGIC_CODE'
          ? 'You will receive a verification code by email each time you log in.'
          : 'Your admin password must be at least 12 characters.'}
      </p>

      <form onSubmit={e => { e.preventDefault(); onSubmit(); }} noValidate className="flex flex-col gap-4">
        <PlatformNameField value={platformName} onChange={onPlatformNameChange} />

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">
            Platform Domain
            {validating ? <span className="ml-2 text-[var(--warning)]">checking…</span>
              : platformDomain && !domainError ? <span className="ml-1 text-[var(--success)]"></span>
              : null}
          </label>
          <input
            type="text"
            value={platformDomain}
            onChange={e => onPlatformDomainChange(e.target.value)}
            placeholder="deploy.mycompany.com"
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]"
          />
          {domainError
            ? <p className="text-xs text-[var(--danger)] mt-1">{domainError}</p>
            : !domainError && platformDomain
              ? <p className="text-xs text-[var(--success)] mt-1">Looks good</p>
              : null}
        </div>

        <CloudflareTokenField value={cloudflareToken} onChange={onCloudflareTokenChange} />

        <CloudflareOAuthSection
          cloudflareClientId={cloudflareClientId}
          cloudflareClientSecret={cloudflareClientSecret}
          derivedRedirectUri={derivedRedirectUri}
          testingConnection={testingConnection}
          connectionTestResult={connectionTestResult}
          onClientIdChange={onCloudflareClientIdChange}
          onClientSecretChange={onCloudflareClientSecretChange}
          onTestConnection={onTestConnection}
        />

        <AdminEmailField value={adminEmail} onChange={onAdminEmailChange} />

        {authMethod === 'PASSWORD' && (
          <PasswordFields
            adminPassword={adminPassword}
            confirmPassword={confirmPassword}
            onAdminPasswordChange={onAdminPasswordChange}
            onConfirmPasswordChange={onConfirmPasswordChange}
          />
        )}

        <CompanyPasswordFields
          setupPassword={setupPassword}
          confirmSetupPassword={confirmSetupPassword}
          onSetupPasswordChange={onSetupPasswordChange}
          onConfirmSetupPasswordChange={onConfirmSetupPasswordChange}
        />

        {formError && <p className="text-sm text-[var(--danger)]" role="alert">{formError}</p>}

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={!canSubmit}>
          Configure Platform
        </Button>
      </form>
    </Card>
  );
}
