'use client';

import { useState } from 'react';

type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

/**
 * The setup form's state.
 *
 * The setup page holds eleven fields and the rules that validate them; that
 * is a form's worth of logic, and it belongs in one place rather than in the
 * page that renders it.
 */
export function useSetupForm() {
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [platformDomain, setPlatformDomain] = useState('');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [cloudflareClientId, setCloudflareClientId] = useState('');
  const [cloudflareClientSecret, setCloudflareClientSecret] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [formError, setFormError] = useState('');

  /** Whether the form is complete enough to submit. */
  function validate(authMethod: AuthMethod): boolean {
    if (!setupToken.trim()) { setFormError('The setup token is required'); return false; }
    if (!platformDomain.trim()) { setFormError('Platform domain is required'); return false; }
    if (!adminEmail.trim()) { setFormError('Admin email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) { setFormError('Enter a valid email address'); return false; }
    if (authMethod === 'PASSWORD') {
      if (!adminPassword) { setFormError('Password is required'); return false; }
      if (adminPassword.length < 12) { setFormError('Password must be at least 12 characters'); return false; }
      if (adminPassword !== confirmPassword) { setFormError('Passwords do not match'); return false; }
    }
    if (!setupPassword) { setFormError('Company password is required'); return false; }
    if (setupPassword.length < 8) { setFormError('Company password must be at least 8 characters'); return false; }
    if (setupPassword !== confirmSetupPassword) { setFormError('Company passwords do not match'); return false; }
    setFormError('');
    return true;
  }

  /** The body the API's configure route takes. */
  function body(authMethod: AuthMethod, serverIp: string): Record<string, string> {
    const payload: Record<string, string> = {
      platformName: platformName.trim() || 'FIDScript Deploy',
      platformDomain: platformDomain.trim(),
      serverIp,
      adminEmail: adminEmail.trim(),
      authMethod,
      setupPassword,
    };
    if (authMethod === 'PASSWORD') payload.adminPassword = adminPassword;
    if (cloudflareToken.trim()) payload.cloudflareApiToken = cloudflareToken.trim();
    if (cloudflareClientId.trim()) payload.cloudflareClientId = cloudflareClientId.trim();
    if (cloudflareClientSecret.trim()) payload.cloudflareClientSecret = cloudflareClientSecret.trim();
    return payload;
  }

  return {
    platformName, setPlatformName,
    platformDomain, setPlatformDomain,
    cloudflareToken, setCloudflareToken,
    cloudflareClientId, setCloudflareClientId,
    cloudflareClientSecret, setCloudflareClientSecret,
    adminEmail, setAdminEmail,
    adminPassword, setAdminPassword,
    confirmPassword, setConfirmPassword,
    setupPassword, setSetupPassword,
    confirmSetupPassword, setConfirmSetupPassword,
    setupToken, setSetupToken,
    formError, setFormError,
    validate,
    body,
  };
}
