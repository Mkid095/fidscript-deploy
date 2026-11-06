'use client';

import { useState } from 'react';
import { SetupLogo } from './shared/setup-logo';
import { MethodStep } from './steps/method-step';
import { DomainStep } from './steps/domain-step';
import { ProgressStep } from './steps/progress-step';
import { DoneStep } from './steps/done-step';
import { useConfigureSubmit } from './hooks/use-configure-submit';
import { useSetupDiscovery } from './hooks/use-setup-discovery';
import { useSetupForm } from './hooks/use-setup-form';

type SetupStep = 'method' | 'domain' | 'progress' | 'done';
type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

export default function SetupPage() {
  const [step, setStep] = useState<SetupStep>('method');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('MAGIC_CODE');
  const [doneDomain, setDoneDomain] = useState('');
  const [operationId, setOperationId] = useState<string | null>(null);
  const { serverIp } = useSetupDiscovery();
  const form = useSetupForm();

  // Cloudflare connection test
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'valid' | 'invalid' | null>(null);

  const { submit: doSubmit } = useConfigureSubmit({
    onSuccess: (id, domain) => {
      setDoneDomain(domain);
      setOperationId(id);
      setStep('progress');
    },
    onError: (msg) => form.setFormError(msg),
  });

  function handleMethodSelect(method: AuthMethod) {
    setAuthMethod(method);
    setStep('domain');
  }

  async function handleSubmit() {
    if (!form.validate(authMethod)) return;
    const payload = form.body(authMethod, serverIp);
    doSubmit(payload as unknown as Parameters<typeof doSubmit>[0], form.setupToken.trim());
  }

  async function handleTestConnection() {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await fetch(
        `${window.location.protocol}//${window.location.host}/api/v1/installation/test-cloudflare-connection`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: form.cloudflareClientId.trim(), clientSecret: form.cloudflareClientSecret.trim() }) }
      );
      const data = await res.json();
      setConnectionTestResult(data.valid ? 'valid' : 'invalid');
    } catch {
      setConnectionTestResult('invalid');
    } finally {
      setTestingConnection(false);
    }
  }

  function handleReset() {
    setStep('method');
    setOperationId(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <div className="w-full max-w-lg">
        <SetupLogo />

        {step === 'method' && (
          <MethodStep
            setupToken={form.setupToken}
            onSetupTokenChange={form.setSetupToken}
            onSelect={handleMethodSelect}
          />
        )}

        {step === 'domain' && (
          <DomainStep
            authMethod={authMethod}
            platformName={form.platformName}
            platformDomain={form.platformDomain}
            cloudflareToken={form.cloudflareToken}
            cloudflareClientId={form.cloudflareClientId}
            cloudflareClientSecret={form.cloudflareClientSecret}
            adminEmail={form.adminEmail}
            adminPassword={form.adminPassword}
            confirmPassword={form.confirmPassword}
            setupPassword={form.setupPassword}
            confirmSetupPassword={form.confirmSetupPassword}
            formError={form.formError}
            onPlatformNameChange={form.setPlatformName}
            onPlatformDomainChange={form.setPlatformDomain}
            onCloudflareTokenChange={form.setCloudflareToken}
            onCloudflareClientIdChange={form.setCloudflareClientId}
            onCloudflareClientSecretChange={form.setCloudflareClientSecret}
            onAdminEmailChange={form.setAdminEmail}
            onAdminPasswordChange={form.setAdminPassword}
            onConfirmPasswordChange={form.setConfirmPassword}
            onSetupPasswordChange={form.setSetupPassword}
            onConfirmSetupPasswordChange={form.setConfirmSetupPassword}
            onTestConnection={handleTestConnection}
            onSubmit={handleSubmit}
            testingConnection={testingConnection}
            connectionTestResult={connectionTestResult}
          />
        )}

        {step === 'progress' && (
          <ProgressStep operationId={operationId} onReset={handleReset} />
        )}

        {step === 'done' && <DoneStep domain={doneDomain} />}
      </div>
    </div>
  );
}
