'use client';

import { useEffect, useState } from 'react';
import { Button, Input } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import type { Onboarding } from '../hooks/use-onboarding';

/**
 * Step two — the account.
 *
 * The name is the only thing the person has to give. It is already known
 * from the sign-up, so this is a confirmation, not a form to fight with.
 */
export function AccountStep({
  onboarding,
  onNext,
  onBack,
}: {
  onboarding: Onboarding;
  onNext: () => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(onboarding.draft.name || user?.name || '');

  useEffect(() => {
    if (!onboarding.draft.name && user?.name) {
      onboarding.setDraft({ name: user.name });
    }
    // The draft is the source of truth; this only seeds it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name]);

  async function handleNext() {
    if (!name.trim()) return;
    onboarding.setDraft({ name: name.trim() });
    await onboarding.saveName();
    onNext();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          What should we call you?
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          It is shown beside everything you deploy, and it is what your teammates see.
        </p>
      </div>

      <Input
        label="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Kennedy Mwangi"
        autoComplete="name"
      />

      {onboarding.error && (
        <p className="text-sm text-[var(--danger)]" role="alert">{onboarding.error}</p>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={handleNext} disabled={!name.trim() || onboarding.saving}>
          {onboarding.saving ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
