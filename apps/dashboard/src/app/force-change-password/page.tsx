'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { PasswordStrength } from '@/components/auth/password-strength';

export default function ForceChangePasswordPage() {
  const { user, changePassword, loading, error } = useAuth();
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
    if (newPassword.length < 12) {
      setValidationError('New password must be at least 12 characters');
      return false;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setValidationError('New password must contain an uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(newPassword)) {
      setValidationError('New password must contain a lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(newPassword)) {
      setValidationError('New password must contain a number');
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
