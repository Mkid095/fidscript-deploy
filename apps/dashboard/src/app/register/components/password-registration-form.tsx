'use client';

import { Button, Input } from '@fidscript/ui';

import { PasswordStrength } from '@/components/auth/password-strength';
import { LoginErrorBanner } from '../../login/components/login-error-banner';
import { InviteKeywordInput } from './invite-keyword-input';

interface PasswordRegistrationFormProps {
  inviteKeyword: string;
  inviteError: string;
  name: string;
  email: string;
  password: string;
  confirm: string;
  validationError: string;
  backendError: string;
  loading: boolean;
  onInviteChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PasswordRegistrationForm({
  inviteKeyword, inviteError,
  name, email, password, confirm,
  validationError, backendError, loading,
  onInviteChange, onNameChange, onEmailChange,
  onPasswordChange, onConfirmChange, onSubmit,
}: PasswordRegistrationFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-4">
        <InviteKeywordInput value={inviteKeyword} error={inviteError} onChange={onInviteChange} />
        <Input
          label="Name"
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            placeholder="At least 12 characters"
            autoComplete="new-password"
          />
          <PasswordStrength password={password} />
        </div>
        <Input
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={e => onConfirmChange(e.target.value)}
          placeholder="Re-enter password"
          autoComplete="new-password"
        />
        {(validationError || backendError) && (
          <LoginErrorBanner message={validationError || backendError} />
        )}
        <Button type="submit" disabled={loading} variant="primary" className="w-full mt-1">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
