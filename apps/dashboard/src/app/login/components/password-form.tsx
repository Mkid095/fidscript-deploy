'use client';

import Link from 'next/link';
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
        autoComplete="username"
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
      {/* The reset screen existed, with nothing pointing at it. */}
      <Link
        href="/forgot-password"
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-center"
      >
        Forgotten your password?
      </Link>
    </form>
  );
}
