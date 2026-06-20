'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { PasswordStrength } from '@/components/auth/password-strength';

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');

  function validate(): boolean {
    if (!name.trim()) { setValidationError('Name is required'); return false; }
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (password.length < 12) { setValidationError('Password must be at least 12 characters'); return false; }
    if (!/[A-Z]/.test(password)) { setValidationError('Password must contain an uppercase letter'); return false; }
    if (!/[a-z]/.test(password)) { setValidationError('Password must contain a lowercase letter'); return false; }
    if (!/[0-9]/.test(password)) { setValidationError('Password must contain a number'); return false; }
    if (password !== confirm) { setValidationError('Passwords do not match'); return false; }
    setValidationError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register(email, name, password);
    } catch {
      // error handled by context
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[#1e2130]">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-200 mb-1">Create account</h1>
          <p className="text-sm text-slate-500">FIDScript Deploy</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                autoComplete="new-password"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
              />
              <PasswordStrength password={password} />
            </div>

            <Input
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            {(validationError || error) && (
              <p className="text-sm text-red-400" role="alert">{validationError || error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full mt-1"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-blue-500 hover:text-blue-400">
            Sign in
          </a>
        </p>
      </Card>
    </div>
  );
}
