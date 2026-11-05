'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { AuthMethodToggle } from './components/auth-method-toggle';
import { PasswordRegistrationForm } from './components/password-registration-form';
import { MagicCodeRegistrationStep } from './components/magic-code-registration-step';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

/**
 * The company password is checked by the SERVER, and only by the server.
 *
 * The old invite keyword was compared in the browser against a hash shipped
 * in the bundle. The company password is stored as a bcrypt hash on the
 * platform — a bcrypt hash cannot be embedded in a bundle, and it should
 * not be: the browser only checks that something was typed, and the server
 * decides whether it is right.
 */

export function RegisterForm() {
  const { register, verifyMagicCode } = useAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordError, setSetupPasswordError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const [backendError, setBackendError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateSetupPassword(): boolean {
    if (!setupPassword) {
      setSetupPasswordError('The company password is required');
      return false;
    }
    return true;
  }

  function validatePassword(): boolean {
    if (!firstName.trim()) { setValidationError('First name is required'); return false; }
    if (!lastName.trim()) { setValidationError('Last name is required'); return false; }
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
    if (!validateSetupPassword()) return;
    if (!validatePassword()) return;
    setLoading(true);
    try {
      await register(email, `${firstName.trim()} ${lastName.trim()}`, password, 'PASSWORD', setupPassword, firstName, lastName);
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicCodeSubmit() {
    setValidationError('');
    setBackendError('');
    if (!validateSetupPassword()) return;
    if (!firstName.trim()) { setValidationError('First name is required'); return; }
    if (!lastName.trim()) { setValidationError('Last name is required'); return; }
    if (!email.trim()) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return; }
    await register(email, `${firstName.trim()} ${lastName.trim()}`, '', 'MAGIC_CODE', setupPassword, firstName, lastName);
  }

  async function handleCodeComplete(rawCode: string) {
    await verifyMagicCode(email, rawCode);
  }

  return (
    <>
      <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />
      {authMethod === 'PASSWORD' ? (
        <PasswordRegistrationForm
          setupPassword={setupPassword}
          setupPasswordError={setupPasswordError}
          firstName={firstName}
          lastName={lastName}
          email={email}
          password={password}
          confirm={confirm}
          validationError={validationError}
          backendError={backendError}
          loading={loading}
          onSetupPasswordChange={v => { setSetupPassword(v); setSetupPasswordError(''); }}
          onFirstNameChange={v => { setFirstName(v); setValidationError(''); }}
          onLastNameChange={v => { setLastName(v); setValidationError(''); }}
          onEmailChange={v => { setEmail(v); setValidationError(''); }}
          onPasswordChange={v => { setPassword(v); setValidationError(''); }}
          onConfirmChange={v => { setConfirm(v); setValidationError(''); }}
          onSubmit={handlePasswordSubmit}
        />
      ) : (
        <MagicCodeRegistrationStep
          firstName={firstName}
          lastName={lastName}
          email={email}
          setupPassword={setupPassword}
          setupPasswordError={setupPasswordError}
          loading={loading}
          validationError={validationError}
          backendError={backendError}
          onFirstNameChange={v => { setFirstName(v); setValidationError(''); }}
          onLastNameChange={v => { setLastName(v); setValidationError(''); }}
          onEmailChange={v => { setEmail(v); setValidationError(''); }}
          onSetupPasswordChange={v => { setSetupPassword(v); setSetupPasswordError(''); }}
          onSubmit={handleMagicCodeSubmit}
          onCodeComplete={handleCodeComplete}
        />
      )}
    </>
  );
}
