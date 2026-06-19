'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  function validate(): boolean {
    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Enter a valid email address');
      return false;
    }
    if (!password) {
      setValidationError('Password is required');
      return false;
    }
    setValidationError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await login(email, password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[#1e2130]">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-200 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500">FIDScript Deploy</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            {(validationError || error) && (
              <p className="text-sm text-red-400">{validationError || error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full mt-1"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          No account?{' '}
          <a href="/register" className="text-blue-500 hover:text-blue-400">
            Register
          </a>
        </p>
      </Card>
    </div>
  );
}
