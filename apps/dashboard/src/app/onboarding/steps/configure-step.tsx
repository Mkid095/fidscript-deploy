'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@fidscript/ui';
import { AuthMethodSelector } from '../components/auth-method-selector';
import { PasswordFields } from '../components/password-fields';
import { BasicConfigFields } from '../components/basic-config-fields';
import { OnboardingShell } from '../components/onboarding-shell';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface ConfigureStepProps {
  prefillServerIp: string;
  prefillAdminEmail: string;
  onConfigure: (data: {
    platformName: string;
    platformDomain: string;
    serverIp: string;
    adminEmail: string;
    authMethod: AuthMethod;
    adminPassword: string;
  }) => void;
}

export function ConfigureStep({ prefillServerIp, prefillAdminEmail, onConfigure }: ConfigureStepProps) {
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setDomain(window.location.host);
    if (prefillAdminEmail) setAdminEmail(prefillAdminEmail);
  }, [prefillAdminEmail]);

  const domainValidAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!domain) { setDomainError(null); setValidating(false); return; }
    const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const formatOk = re.test(domain) && !domain.startsWith('.') && domain.length <= 253;
    if (!formatOk) { setDomainError('Enter a valid domain like deploy.example.com'); return; }
    setDomainError(null);

    const timer = setTimeout(() => {
      domainValidAbortRef.current?.abort();
      const controller = new AbortController();
      domainValidAbortRef.current = controller;
      setValidating(true);
      const currentDomain = domain;
      fetch(
        `${window.location.protocol}//${window.location.host}/api/v1/installation/validate?platformDomain=${encodeURIComponent(currentDomain)}`,
        { signal: controller.signal }
      )
        .then(res => res.json())
        .then((payload: { validations: Array<{ step: string; valid: boolean; issues: string[] }> }) => {
          if (currentDomain !== domain) return;
          const dnsVal = payload.validations?.find(v => v.step === 'dns');
          if (dnsVal && !dnsVal.valid) setDomainError(dnsVal.issues[0] ?? 'Domain validation failed');
        })
        .catch(err => { if (err.name !== 'AbortError') setDomainError('Validation request failed'); })
        .finally(() => { if (currentDomain === domain) setValidating(false); });
    }, 500);

    return () => { clearTimeout(timer); domainValidAbortRef.current?.abort(); };
  }, [domain]);

  function validateEmail(addr: string): boolean {
    if (!addr.trim()) { setEmailError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setEmailError('Enter a valid email address'); return false; }
    setEmailError(null);
    return true;
  }

  function validatePassword(): boolean {
    if (authMethod !== 'PASSWORD') { setPasswordError(null); return true; }
    if (!adminPassword) { setPasswordError('Password is required'); return false; }
    if (adminPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return false; }
    if (adminPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return false; }
    setPasswordError(null);
    return true;
  }

  function handleSubmit() {
    if (!validateEmail(adminEmail)) return;
    if (!validatePassword()) return;
    onConfigure({
      platformName,
      platformDomain: domain,
      serverIp: prefillServerIp || '127.0.0.1',
      adminEmail,
      authMethod,
      adminPassword,
    });
  }

  const canSubmit =
    domain.trim() && !domainError && !validating &&
    adminEmail.trim() && !emailError &&
    (authMethod === 'MAGIC_CODE' || (adminPassword && !passwordError));

  return (
    <OnboardingShell
      title="Configure your platform"
      subtitle="Set up admin credentials and platform domain"
    >
      <div className="space-y-5">
        <BasicConfigFields
          platformName={platformName}
          domain={domain}
          adminEmail={adminEmail}
          domainError={domainError}
          emailError={emailError}
          validating={validating}
          onPlatformNameChange={setPlatformName}
          onDomainChange={setDomain}
          onAdminEmailChange={value => { setAdminEmail(value); setEmailError(null); }}
          onAdminEmailBlur={validateEmail}
        />
        <AuthMethodSelector value={authMethod} onChange={setAuthMethod} />
        {authMethod === 'PASSWORD' && (
          <PasswordFields
            password={adminPassword}
            confirmPassword={confirmPassword}
            onPasswordChange={setAdminPassword}
            onConfirmChange={setConfirmPassword}
            inlineError={passwordError}
            setInlineError={setPasswordError}
          />
        )}
      </div>
      <Button
        variant="primary"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full mt-7"
        size="md"
      >
        {authMethod === 'PASSWORD' ? 'Configure platform' : 'Configure & continue'}
      </Button>
    </OnboardingShell>
  );
}
