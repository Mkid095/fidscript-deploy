'use client';

import { useState } from 'react';
import { SetupLogo } from './shared/setup-logo';
import { MethodStep } from './steps/method-step';
import { DomainStep } from './steps/domain-step';
import { ProgressStep } from './steps/progress-step';
import { DoneStep } from './steps/done-step';
import { useConfigureSubmit } from './hooks/use-configure-submit';
import { useSetupDiscovery } from './hooks/use-setup-discovery';

type SetupStep = 'method' | 'domain' | 'progress' | 'done';
type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

export default function SetupPage() {
  const [step, setStep] = useState<SetupStep>('method');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('MAGIC_CODE');
  const [doneDomain, setDoneDomain] = useState('');
  const [operationId, setOperationId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { serverIp } = useSetupDiscovery();

  // Form field state
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [platformDomain, setPlatformDomain] = useState('');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [cloudflareClientId, setCloudflareClientId] = useState('');
  const [cloudflareClientSecret, setCloudflareClientSecret] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Cloudflare connection test
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'valid' | 'invalid' | null>(null);

  const { submit: doSubmit } = useConfigureSubmit({
    onSuccess: (id, domain) => {
      setDoneDomain(domain);
      setOperationId(id);
      setStep('progress');
    },
    onError: (msg) => setFormError(msg),
  });

  function handleMethodSelect(method: AuthMethod) {
    setAuthMethod(method);
    setStep('domain');
  }

  function validateForm(): boolean {
    if (!platformDomain.trim()) { setFormError('Platform domain is required'); return false; }
    if (!adminEmail.trim()) { setFormError('Admin email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) { setFormError('Enter a valid email address'); return false; }
    if (authMethod === 'PASSWORD') {
      if (!adminPassword) { setFormError('Password is required'); return false; }
      if (adminPassword.length < 12) { setFormError('Password must be at least 12 characters'); return false; }
      if (adminPassword !== confirmPassword) { setFormError('Passwords do not match'); return false; }
    }
    setFormError('');
    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    const body: Record<string, string> = {
      platformName: platformName.trim() || 'FIDScript Deploy',
      platformDomain: platformDomain.trim(),
      serverIp,
      adminEmail: adminEmail.trim(),
      authMethod,
    };
    if (authMethod === 'PASSWORD') body.adminPassword = adminPassword;
    if (cloudflareToken.trim()) body.cloudflareApiToken = cloudflareToken.trim();
    if (cloudflareClientId.trim()) body.cloudflareClientId = cloudflareClientId.trim();
    if (cloudflareClientSecret.trim()) body.cloudflareClientSecret = cloudflareClientSecret.trim();
    doSubmit(body as Parameters<typeof doSubmit>[0]);
  }

  async function handleTestConnection() {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await fetch(
        `${window.location.protocol}//${window.location.host}/api/v1/installation/test-cloudflare-connection`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: cloudflareClientId.trim(), clientSecret: cloudflareClientSecret.trim() }) }
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

        {step === 'method' && <MethodStep onSelect={handleMethodSelect} />}

        {step === 'domain' && (
          <DomainStep
            authMethod={authMethod}
            platformName={platformName}
            platformDomain={platformDomain}
            cloudflareToken={cloudflareToken}
            cloudflareClientId={cloudflareClientId}
            cloudflareClientSecret={cloudflareClientSecret}
            adminEmail={adminEmail}
            adminPassword={adminPassword}
            confirmPassword={confirmPassword}
            formError={formError}
            onPlatformNameChange={setPlatformName}
            onPlatformDomainChange={setPlatformDomain}
            onCloudflareTokenChange={setCloudflareToken}
            onCloudflareClientIdChange={setCloudflareClientId}
            onCloudflareClientSecretChange={setCloudflareClientSecret}
            onAdminEmailChange={setAdminEmail}
            onAdminPasswordChange={setAdminPassword}
            onConfirmPasswordChange={setConfirmPassword}
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
