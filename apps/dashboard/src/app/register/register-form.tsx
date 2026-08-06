'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { AuthMethodToggle } from './components/auth-method-toggle';
import { PasswordRegistrationForm } from './components/password-registration-form';
import { MagicCodeRegistrationStep } from './components/magic-code-registration-step';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

// Pre-submit invite hash check. Read from NEXT_PUBLIC_INVITE_HASH so each
// installation can use its own per-deploy invite. The API is the source of
// truth (see apps/api/src/modules/auth/services/auth-register.service.ts:
// SIGNUP_INVITE_KEYWORD) — this gate exists only to fail fast in the UI.
const INVITE_HASH = process.env.NEXT_PUBLIC_INVITE_HASH ?? '';

async function hashKeyword(kw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(kw.toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function RegisterForm() {
  const { register, verifyMagicCode } = useAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');
  const [inviteKeyword, setInviteKeyword] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const [backendError, setBackendError] = useState('');
  const [loading, setLoading] = useState(false);

  async function validateInviteClientSide(): Promise<boolean> {
    if (!inviteKeyword.trim()) { setInviteError('Invite keyword is required'); return false; }
    // If the env var isn't configured, the client has nothing to compare
    // against — defer to the server (which always validates against
    // SIGNUP_INVITE_KEYWORD).
    if (!INVITE_HASH) return true;
    const hashed = await hashKeyword(inviteKeyword);
    if (hashed !== INVITE_HASH) { setInviteError('Invalid invite keyword'); return false; }
    return true;
  }

  function handleInviteChange(val: string) {
    setInviteKeyword(val);
    setInviteError('');
  }

  function validatePassword(): boolean {
    if (!name.trim()) { setValidationError('Name is required'); return false; }
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (password.length < 12) { setValidationError('Password must be at least 12 characters'); return false; }
    if (!/[A-Z]/.test(password)) { setValidationError('Password must contain an uppercase letter'); return false; }
    if (!/[a-z]/.test(password)) { setValidationError('Password must contain a lowercase letter'); return false; }
    if (!/[0-9]/.test(password)) { setValidationError('Password must contain a number'); return false; }
    if (password !== confirm) { setValidationError('Passwords do not match'); return false; }
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');
    setBackendError('');
    if (!(await validateInviteClientSide())) return;
    if (!validatePassword()) return;
    setLoading(true);
    try {
      await register(email, name, password, 'PASSWORD');
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicCodeSubmit() {
    setValidationError('');
    setBackendError('');
    if (!(await validateInviteClientSide())) return;
    if (!name.trim()) { setValidationError('Name is required'); return; }
    if (!email.trim()) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return; }
    await register(email, name, '', 'MAGIC_CODE');
  }

  async function handleCodeComplete(rawCode: string) {
    await verifyMagicCode(email, rawCode);
  }

  return (
    <>
      <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />
      {authMethod === 'PASSWORD' ? (
        <PasswordRegistrationForm
          inviteKeyword={inviteKeyword}
          inviteError={inviteError}
          name={name}
          email={email}
          password={password}
          confirm={confirm}
          validationError={validationError}
          backendError={backendError}
          loading={loading}
          onInviteChange={handleInviteChange}
          onNameChange={v => { setName(v); setValidationError(''); }}
          onEmailChange={v => { setEmail(v); setValidationError(''); }}
          onPasswordChange={v => { setPassword(v); setValidationError(''); }}
          onConfirmChange={v => { setConfirm(v); setValidationError(''); }}
          onSubmit={handlePasswordSubmit}
        />
      ) : (
        <MagicCodeRegistrationStep
          name={name}
          email={email}
          loading={loading}
          validationError={validationError}
          backendError={backendError}
          onNameChange={v => { setName(v); setValidationError(''); }}
          onEmailChange={v => { setEmail(v); setValidationError(''); }}
          onSubmit={handleMagicCodeSubmit}
          onCodeComplete={handleCodeComplete}
        />
      )}
    </>
  );
}
