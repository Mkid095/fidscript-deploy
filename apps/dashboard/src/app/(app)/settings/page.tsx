'use client';


import { useEffect, useState } from 'react';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';

import { makeSdk } from '@/lib/sdk';
import { useAuth } from '@/contexts/auth-context';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKeys() {
      setLoadingKeys(true);
      try {
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = makeSdk(token);
        const projects = await sdk.projects.list();
        if (projects.length === 0) { setLoadingKeys(false); return; }
        // fetch API keys from the first project for now (user-level keys would be a separate endpoint)
        const keys = await sdk.projects.listApiKeys(projects[0].id);
        setApiKeys(keys);
      } catch {
        // API keys may not be available in this context
      } finally {
        setLoadingKeys(false);
      }
    }
    loadKeys();
  }, []);

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    setRevoking(keyId);
    setRevokeError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = makeSdk(token);
      const projects = await sdk.projects.list();
      if (projects.length > 0) {
        await sdk.projects.revokeApiKey(projects[0].id, keyId);
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
      }
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Permanently delete your account? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All your projects, data, and deployments will be deleted.')) return;
    // In a real implementation this would call the API
    alert('Please contact support to delete your account.');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-200 mb-6">Settings</h1>

      {/* Profile */}
      <Card className="border border-[#1e2130] mb-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Profile</h2>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-200">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Name</p>
            <p className="text-sm text-slate-200">{user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Role</p>
            <p className="text-sm text-slate-200 capitalize">{user?.role ?? '—'}</p>
          </div>
        </div>
      </Card>

      {/* API Keys */}
      <Card className="border border-[#1e2130] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">API Keys</h2>
        </div>

        {loadingKeys ? (
          <Spinner size="md" />
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-slate-500">No API keys created yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeys.map(key => (
              <div
                key={key.id}
                className="flex items-center justify-between px-3 py-2.5 bg-[#080a0d] border border-[#1e2130] rounded-md"
              >
                <div>
                  <p className="text-sm text-slate-200">{key.name}</p>
                  <p className="text-xs text-slate-500">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={revoking === key.id}
                  onClick={() => handleRevoke(key.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}

        {revokeError && <p className="text-red-400 text-xs mt-3">{revokeError}</p>}
      </Card>

      {/* Danger Zone */}
      <Card className="border border-red-500/50">
        <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">Delete Account</p>
            <p className="text-xs text-slate-500">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
