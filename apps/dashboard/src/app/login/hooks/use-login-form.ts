'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

export function useLoginForm(platformAuthMethod: AuthMethod | null) {
  const { login, sendMagicCode, verifyMagicCode, lookupAuthMethod, loading, error } = useAuth();
  const [effectiveMethod, setEffectiveMethod] = useState<AuthMethod>(
    platformAuthMethod ?? 'PASSWORD'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [magicStep, setMagicStep] = useState<'email' | 'code'>('email');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [magicError, setMagicError] = useState('');
  const [countdown, setCountdown] = useState(0);

  async function handleEmailChange(addr: string) {
    setEmail(addr);
    setValidationError('');
    if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return;
    setDetecting(true);
    try {
      const method = await lookupAuthMethod(addr);
      setEffectiveMethod(method ?? platformAuthMethod ?? 'PASSWORD');
    } catch {
      setEffectiveMethod(platformAuthMethod ?? 'PASSWORD');
    } finally {
      setDetecting(false);
    }
  }

  function validatePassword(): boolean {
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (!password) { setValidationError('Password is required'); return false; }
    setValidationError('');
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword()) return;
    try { await login(email, password); } catch { /* handled by context */ }
  }

  async function handleSendCode() {
    if (!email.trim()) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return; }
    setValidationError('');
    try {
      await sendMagicCode(email);
      const [local, domain] = email.split('@');
      setMaskedEmail(`${local.slice(0, 2)}***@${domain}`);
      setMagicStep('code');
      setCountdown(30);
    } catch { /* sendMagicCode always succeeds */ }
  }

  async function handleCodeComplete(rawCode: string) {
    if (code) return;
    setCode(rawCode);
    try {
      await verifyMagicCode(email, rawCode);
    } catch (err) {
      setCode('');
      setMagicError(err instanceof Error ? err.message : 'Invalid or expired code');
    }
  }

  function resetMagicStep() {
    setMagicStep('email');
    setCode('');
    setMagicError('');
  }

  function setPasswordAndClearError(value: string) {
    setPassword(value);
    setValidationError('');
  }

  const showPassword = effectiveMethod === 'PASSWORD';
  const showMagic = effectiveMethod === 'MAGIC_CODE';
  const displayError = validationError || error;

  return {
    effectiveMethod,
    setEffectiveMethod,
    email,
    password,
    detecting,
    magicStep,
    maskedEmail,
    code,
    magicError,
    countdown,
    loading,
    displayError,
    showPassword,
    showMagic,
    handleEmailChange,
    handlePasswordSubmit,
    handleSendCode,
    handleCodeComplete,
    resetMagicStep,
    setPassword: setPasswordAndClearError,
  };
}
