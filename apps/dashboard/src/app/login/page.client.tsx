'use client';

import Link from 'next/link';
import { useLoginForm } from './hooks/use-login-form';
import { AuthMethodTabs } from './components/auth-method-tabs';
import { PasswordForm } from './components/password-form';
import { MagicCodeForm } from './components/magic-code-form';
import { AuthPageShell } from './components/auth-page-shell';
import { LoginThemeToggle } from './login-theme-toggle';
import { PlatformAuthBadge } from './components/platform-auth-badge';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface LoginClientProps {
  platformAuthMethod: AuthMethod | null;
}

export function LoginClient({ platformAuthMethod }: LoginClientProps) {
  const form = useLoginForm(platformAuthMethod);
  const showTabs = platformAuthMethod === null;

  const footer = (
    <p className="text-center text-sm text-[var(--text-muted)] mt-6">
      No account?{' '}
      <Link href="/register" className="text-[var(--accent)] hover:underline font-medium">
        Register
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      title="Sign in to your platform"
      subtitle="Enter your credentials to access the dashboard"
      footer={footer}
    >
      <div className="flex flex-col items-center mb-6">
        <img
          src="/logo.svg"
          alt="FIDScript"
          width={140}
          height={32}
          className="h-8 w-auto"
        />
      </div>
      <LoginThemeToggle />
      {showTabs && (
        <AuthMethodTabs
          value={form.effectiveMethod}
          onChange={form.setEffectiveMethod as (m: AuthMethod) => void}
          onSelect={form.resetMagicStep}
        />
      )}
      {!showTabs && <PlatformAuthBadge method={form.effectiveMethod} />}
      {form.showPassword && (
        <PasswordForm
          email={form.email}
          password={form.password}
          loading={form.loading}
          detecting={form.detecting}
          errorMessage={form.displayError}
          onEmailChange={form.handleEmailChange}
          onPasswordChange={form.setPassword}
          onSubmit={form.handlePasswordSubmit}
        />
      )}
      {form.showMagic && (
        <MagicCodeForm
          email={form.email}
          maskedEmail={form.maskedEmail}
          step={form.magicStep}
          code={form.code}
          magicError={form.magicError}
          countdown={form.countdown}
          detecting={form.detecting}
          errorMessage={form.magicStep === 'email' ? form.displayError : null}
          onEmailChange={form.handleEmailChange}
          onSendCode={form.handleSendCode}
          onCodeComplete={form.handleCodeComplete}
          onUseDifferentEmail={form.resetMagicStep}
        />
      )}
    </AuthPageShell>
  );
}
