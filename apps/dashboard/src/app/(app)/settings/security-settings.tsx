'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

interface SecuritySettingsProps {
  onRevoke: (keyId: string) => void;
  revoking: string | null;
  revokeError: string | null;
}

export function SecuritySettings({ onRevoke, revoking, revokeError }: SecuritySettingsProps) {
  const { getSdk } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

  useEffect(() => {
    async function loadKeys() {
      setLoadingKeys(true);
      try {
        const sdk = getSdk();
        const { projects } = await sdk.projects.list();
        if (projects.length === 0) { setLoadingKeys(false); return; }
        const keys = await sdk.projects.listApiKeys(projects[0].id);
        setApiKeys(keys);
      } catch { /* API keys may not be available */ }
      finally { setLoadingKeys(false); }
    }
    loadKeys();
  }, [getSdk]);

  async function handleDeleteAccount() {
    if (!confirm('Permanently delete your account? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All your projects, data, and deployments will be deleted.')) return;
    alert('Please contact support to delete your account.');
  }

  return (
    <>
      <Card className="border border-[var(--rail)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">API Keys</h2>
        </div>
        {loadingKeys ? (
          <Spinner size="md" />
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No API keys created yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                <div>
                  <p className="text-sm text-[var(--text)]">{key.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                </div>
                <Button variant="danger" size="sm" loading={revoking === key.id} onClick={() => onRevoke(key.id)}>Revoke</Button>
              </div>
            ))}
          </div>
        )}
        {revokeError && <p className="text-[var(--danger)] text-xs mt-3">{revokeError}</p>}
      </Card>

      <Card className="border border-[var(--danger)]/50">
        <h2 className="text-sm font-semibold text-[var(--danger)] mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Delete Account</p>
            <p className="text-xs text-[var(--text-muted)]">Permanently delete your account and all associated data. This cannot be undone.</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount}>Delete</Button>
        </div>
      </Card>
    </>
  );
}
