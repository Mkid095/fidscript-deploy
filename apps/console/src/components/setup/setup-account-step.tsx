'use client';

import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

/**
 * The administrator.
 *
 * The account the platform is entered with, and the password it is entered
 * with — twelve characters, an upper case letter, a lower case letter and
 * a number, which is the rule the platform enforces as well.
 */
export function SetupAccountStep({
  email,
  onChange,
}: {
  email: string;
  onChange: (next: { email?: string; password?: string }) => void;
}) {
  const [password, setPassword] = useState('');

  const problems = [
    password.length < 12 ? 'twelve characters' : null,
    !/[A-Z]/.test(password) ? 'an uppercase letter' : null,
    !/[0-9]/.test(password) ? 'a number' : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="max-w-xl space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">The administrator</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          The account the platform is entered with. It is the account that owns
          the first project, and it is the one the recovery mail goes to.
        </p>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => onChange({ email: event.target.value })}
      />

      <PasswordInput
        label="Password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          onChange({ password: event.target.value });
        }}
        hint={
          problems.length > 0
            ? `It still needs ${problems.join(', ')}.`
            : 'It has what it needs.'
        }
        autoComplete="new-password"
      />
    </Card>
  );
}
