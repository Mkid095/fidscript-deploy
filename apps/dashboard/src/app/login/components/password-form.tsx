'use client';

import { Button, Input } from '@fidscript/ui';
import { LoginErrorBanner } from './login-error-banner';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface PasswordFormProps {
  email: string;
  password: string;
  loading: boolean;
  detecting: boolean;
  errorMessage: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PasswordForm({
  email,
  password,
  loading,
  detecting,
  errorMessage,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: PasswordFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errorMessage && <LoginErrorBanner message={errorMessage} />}
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={e => onEmailChange(e.target.value)}
        placeholder="admin@example.com"
        autoComplete="email"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={e => onPasswordChange(e.target.value)}
        placeholder="Enter your password"
        autoComplete="current-password"
      />
      <Button
        type="submit"
        disabled={loading || detecting}
        variant="primary"
        className="w-full mt-1"
        size="md"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
