'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { PasswordStrength } from '@/components/auth/password-strength';
import { PASSWORD_POLICY_MESSAGE, isPasswordAcceptable } from '@/lib/password-policy';

function ForceChangePasswordPageInner() {
  const { user, changePassword, loading, error } = useAuth();

  // This page is for somebody who IS signed in — the platform sends them
  // here when the account still has the installer's password. A visitor who
  // is not signed in was shown the form and got "Not authenticated" back.
  useEffect(() => {
    if (user === null) {
      window.location.href = '/login?next=%2Fforce-change-password';
    }
  }, [user]);
  const hasPasswordCredential = user?.credentials?.some(c => c.type === 'PASSWORD') ?? false;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const [serverError, setServerError] = useState('');

  function validate(): boolean {
    if (hasPasswordCredential && !currentPassword) {
      setValidationError('Current password is required');
      return false;
    }
    if (!isPasswordAcceptable(newPassword)) {
      setValidationError(PASSWORD_POLICY_MESSAGE);
      return false;
    }
    if (hasPasswordCredential && newPassword === currentPassword) {
      setValidationError('New password must be different from current password');
      return false;
    }
    if (newPassword !== confirm) {
      setValidationError('Passwords do not match');
      return false;
    }
    setValidationError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    try {
      // Magic-code-only users call changePassword with empty currentPassword
      await changePassword(hasPasswordCredential ? currentPassword : '', newPassword);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Password change failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">
            {hasPasswordCredential ? 'Change your password' : 'Create a password'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {hasPasswordCredential
              ? 'Choose a new password to replace your current one.'
              : 'You are using a magic code login. Create a password to secure your account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            {hasPasswordCredential && (
              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
            )}

            <div className="space-y-1">
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 12 characters"
                autoComplete="new-password"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
              <PasswordStrength password={newPassword} />
            </div>

            <Input
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
            />

            {(validationError || serverError || error) && (
              <p className="text-sm text-[var(--danger)]">
                {validationError || serverError || error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full mt-1"
            >
              {loading ? 'Updating...' : hasPasswordCredential ? 'Update & continue' : 'Create & continue'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/**
 * The page reads the token from the address, so it is rendered inside a
 * boundary — Next cannot prerender a page whose query string it does not
 * know at build time.
 */
export default function ForceChangePasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)] p-6">Checking…</p>}>
      <ForceChangePasswordPageInner />
    </Suspense>
  );
}
