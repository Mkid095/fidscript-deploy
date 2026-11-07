'use client';

import { Button, Input } from '@fidscript/ui';

import { PasswordStrength } from '@/components/auth/password-strength';
import { LoginErrorBanner } from '../../login/components/login-error-banner';
import { SetupPasswordInput } from './setup-password-input';

interface PasswordRegistrationFormProps {
  setupPassword: string;
  setupPasswordError: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  validationError: string;
  backendError: string;
  loading: boolean;
  onSetupPasswordChange: (v: string) => void;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PasswordRegistrationForm({
  setupPassword, setupPasswordError,
  firstName, lastName, email, password, confirm,
  validationError, backendError, loading,
  onSetupPasswordChange, onFirstNameChange, onLastNameChange, onEmailChange,
  onPasswordChange, onConfirmChange, onSubmit,
}: PasswordRegistrationFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            type="text"
            value={firstName}
            onChange={e => onFirstNameChange(e.target.value)}
            placeholder="Ada"
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            type="text"
            value={lastName}
            onChange={e => onLastNameChange(e.target.value)}
            placeholder="Lovelace"
            autoComplete="family-name"
          />
        </div>
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
        <SetupPasswordInput
          value={setupPassword}
          error={setupPasswordError}
          onChange={onSetupPasswordChange}
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
