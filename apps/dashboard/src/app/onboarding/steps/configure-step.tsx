'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';

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

  function validatePassword(): boolean {
    if (authMethod === 'PASSWORD') {
      if (!adminPassword) { setPasswordError('Password is required'); return false; }
      if (adminPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return false; }
      if (adminPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return false; }
    }
    setPasswordError(null);
    return true;
  }

  function handleSubmit() {
    if (!validatePassword()) return;
    onConfigure({ platformName, platformDomain: domain, serverIp: prefillServerIp || '127.0.0.1', adminEmail, authMethod, adminPassword });
  }

  const canSubmit = domain.trim() && !domainError && adminEmail.trim() && (!adminPassword || !passwordError);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-[var(--text)] mb-1">Configure your platform</div>
          <div className="text-sm text-[var(--text-muted)]">Set up admin credentials and domain.</div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Platform name</label>
            <input type="text" value={platformName}
              onChange={e => setPlatformName(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">
              Platform domain
              {validating ? <span className="ml-2 text-[var(--warning)]">checking…</span>
                : domain && !domainError ? <span className="ml-1 text-[var(--success)]"></span> : null}
            </label>
            <input type="text" value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="deploy.example.com"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            {domainError ? <p className="text-xs text-[var(--danger)] mt-1">{domainError}</p>
              : !domainError && domain ? <p className="text-xs text-[var(--success)] mt-1">Looks good</p> : null}
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Administrator email</label>
            <input type="email" value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Auth method selector */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Login method</label>
            <div className="flex border border-[var(--rail)] rounded-lg overflow-hidden">
              <button type="button" onClick={() => setAuthMethod('PASSWORD')}
                className={`flex-1 py-2 px-3 text-sm flex items-center justify-center gap-2 transition-colors ${
                  authMethod === 'PASSWORD' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--rail)]'
                }`}>
                <HugeiconsIcon icon={LockPasswordIcon} size={14} />Password
              </button>
              <button type="button" onClick={() => setAuthMethod('MAGIC_CODE')}
                className={`flex-1 py-2 px-3 text-sm flex items-center justify-center gap-2 transition-colors ${
                  authMethod === 'MAGIC_CODE' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--rail)]'
                }`}>
                <HugeiconsIcon icon={Mail01Icon} size={14} />Magic code
              </button>
            </div>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              {authMethod === 'PASSWORD' ? 'Admin logs in with email and password.' : 'Admin receives a one-time code via email.'}
            </p>
          </div>

          {authMethod === 'PASSWORD' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Admin password</label>
                <input type="password" value={adminPassword}
                  onChange={e => { setAdminPassword(e.target.value); setPasswordError(null); }}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Confirm password</label>
                <input type="password" value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                  placeholder="Repeat password"
                  className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              {passwordError && <p className="text-xs text-[var(--danger)]">{passwordError}</p>}
            </div>
          )}
        </div>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit} className="w-full mt-6">
          {authMethod === 'PASSWORD' ? 'Configure platform' : 'Configure & continue'}
        </Button>
      </Card>
    </div>
  );
}
