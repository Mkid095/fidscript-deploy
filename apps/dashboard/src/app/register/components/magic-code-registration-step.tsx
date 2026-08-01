'use client';

import { useState } from 'react';
import { Button, Input } from '@fidscript/ui';
import { LoginErrorBanner } from '../../login/components/login-error-banner';
import { MagicCodeConfirmStep } from './magic-code-confirm-step';

interface MagicCodeRegistrationStepProps {
  name: string;
  email: string;
  loading: boolean;
  validationError: string;
  backendError: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  onCodeComplete: (code: string) => void;
}

export function MagicCodeRegistrationStep({
  name, email, loading, validationError, backendError,
  onNameChange, onEmailChange, onSubmit, onCodeComplete,
}: MagicCodeRegistrationStepProps) {
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalLoading(true);
    try {
      await onSubmit();
      const [local, domain] = email.split('@');
      setMaskedEmail(`${local.slice(0, 2)}***@${domain}`);
      setStep('code');
    } finally {
      setLocalLoading(false);
    }
  }

  if (step === 'code') {
    return (
      <MagicCodeConfirmStep
        maskedEmail={maskedEmail}
        onResend={onSubmit}
        onCodeComplete={onCodeComplete}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20 p-3">
          <p className="text-xs text-[var(--warning)]">
            A magic code will be sent to your email each time you sign in.
          </p>
        </div>
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
        {(validationError || backendError) && (
          <LoginErrorBanner message={validationError || backendError} />
        )}
        <Button type="submit" disabled={loading || localLoading} variant="primary" className="w-full mt-1">
          {localLoading ? 'Sending code…' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
