'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ErrorState } from '@/components/ui/feedback';

/**
 * The password policy.
 *
 * The same rule the platform enforces: twelve characters, an upper case
 * letter, a lower case letter and a number. The browser checks it so the
 * person finds out now; the platform checks it again, because the browser is
 * not the gate.
 */
export const PASSWORD_MIN_LENGTH = 12;

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (!/[0-9]/.test(password)) problems.push('a number');
  return problems;
}

export function RegisterForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('A name is required.');
      return;
    }
    if (!email.trim()) {
      setError('An email address is required.');
      return;
    }
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      setError(`The password needs ${problems.join(', ')}.`);
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await browserApi.post('/auth/register', {
        email: email.trim(),
        password,
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        authMethod: 'PASSWORD',
        ...(companyPassword ? { setupPassword: companyPassword } : {}),
      });
      router.replace('/overview');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The account could not be created.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">Create an account</h1>
        <p className="mt-1 text-sm text-text-muted">On this platform.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
          required
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="family-name"
          required
        />
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="username"
        required
      />

      <PasswordInput
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a lowercase letter and a number`}
        autoComplete="new-password"
        required
      />

      <PasswordInput
        label="Confirm password"
        placeholder="••••••••"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="new-password"
        required
      />

      <PasswordInput
        label="Company password"
        placeholder="••••••••"
        value={companyPassword}
        onChange={(event) => setCompanyPassword(event.target.value)}
        hint="If this platform has one. The platform checks it, not the browser."
        autoComplete="off"
      />

      {error ? <ErrorState message={error} /> : null}

      <Button type="submit" variant="primary" loading={submitting} className="w-full">
        {submitting ? 'Creating…' : 'Create the account'}
      </Button>

      <p className="pt-1 text-center text-xs text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="transition hover:text-text">
          Sign in
        </Link>
      </p>
    </form>
  );
}
