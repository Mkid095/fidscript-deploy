import { LoginClient } from './page.client';

async function getInstallationStatus() {
  try {
    const res = await fetch('http://api:3001/api/v1/installation/status', {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function LoginPage() {
  const status = await getInstallationStatus();
  return <LoginClient platformAuthMethod={status?.authMethod ?? null} />;
}
