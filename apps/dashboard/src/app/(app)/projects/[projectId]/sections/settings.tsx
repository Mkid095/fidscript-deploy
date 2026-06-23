'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Spinner, Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

interface EnvVar {
  key: string;
  value: string;
  encrypted: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

interface Props { project: Project }

export function SettingsSection({ project }: Props) {
  const { getSdk } = useAuth();

  // Env vars
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envLoading, setEnvLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [envSaving, setEnvSaving] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [showAddKey, setShowAddKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyCreating, setKeyCreating] = useState(false);

  // Delete project
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sdk = getSdk();
        const [vars, keys] = await Promise.all([
          sdk.projects.getEnvVars(project.id) as Promise<EnvVar[]>,
          sdk.projects.listApiKeys(project.id) as Promise<ApiKey[]>,
        ]);
        setEnvVars(Array.isArray(vars) ? vars : []);
        setApiKeys(keys ?? []);
      } catch { /* ignore */ } finally {
        setEnvLoading(false);
        setApiLoading(false);
      }
    }
    load();
  }, [project.id, getSdk]);

  function toggleReveal(key: string) {
    setRevealed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleAddEnv(e: React.FormEvent) {
    e.preventDefault();
    if (!envKey.trim()) return;
    setEnvSaving(true);
    setEnvError(null);
    try {
      const sdk = getSdk();
      const allVars = [...envVars, { key: envKey.trim(), value: envValue, encrypted: false }];
      const varMap: Record<string, string> = {};
      for (const v of allVars) varMap[v.key] = v.value;
      await sdk.projects.setEnvVars(project.id, varMap);
      setEnvVars([...envVars, { key: envKey.trim(), value: envValue, encrypted: false }]);
      setEnvKey('');
      setEnvValue('');
      setShowAddEnv(false);
    } catch (err) {
      setEnvError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEnvSaving(false);
    }
  }

  async function handleDeleteEnv(key: string) {
    const updated = envVars.filter(v => v.key !== key);
    const varMap: Record<string, string> = {};
    for (const v of updated) varMap[v.key] = v.value;
    await getSdk().projects.setEnvVars(project.id, varMap);
    setEnvVars(updated);
  }

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setKeyCreating(true);
    try {
      const sdk = getSdk();
      const result = await sdk.projects.createApiKey(project.id, keyName.trim()) as { apiKey: ApiKey; key: string };
      setNewKey(result.key);
      setApiKeys(prev => [...prev, result.apiKey]);
      setKeyName('');
    } finally {
      setKeyCreating(false);
    }
  }

  async function handleRevokeKey(keyId: string) {
    await getSdk().projects.revokeApiKey(project.id, keyId);
    setApiKeys(prev => prev.filter(k => k.id !== keyId));
  }

  async function handleDeleteProject() {
    if (deleteConfirmText !== project.name) return;
    setDeleting(true);
    try {
      await getSdk().projects.delete(project.id);
      window.location.href = '/projects';
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Environment Variables */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Environment Variables</h3>
          <Button variant="secondary" size="sm" onClick={() => setShowAddEnv(true)}>+ Add</Button>
        </div>
        {envLoading ? (
          <Spinner size="md" />
        ) : envVars.length === 0 ? (
          <p className="text-sm text-slate-500">No environment variables set.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {envVars.map(env => (
              <div key={env.key} className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2130] rounded-md text-xs font-mono">
                <span className="text-slate-400 min-w-40">{env.key}</span>
                <span className="text-slate-200 flex-1 break-all">
                  {env.encrypted && !revealed[env.key] ? '••••••••' : env.value}
                </span>
                {env.encrypted && (
                  <button onClick={() => toggleReveal(env.key)} className="bg-none border-none text-slate-500 cursor-pointer text-xs hover:text-slate-300 flex-shrink-0">
                    {revealed[env.key] ? 'Hide' : 'Reveal'}
                  </button>
                )}
                <button onClick={() => handleDeleteEnv(env.key)} className="bg-none border-none text-red-500 cursor-pointer text-xs hover:text-red-400 flex-shrink-0">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">API Keys</h3>
          <Button variant="secondary" size="sm" onClick={() => { setShowAddKey(true); setNewKey(null); }}>+ New Key</Button>
        </div>
        {apiLoading ? (
          <Spinner size="md" />
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-slate-500">No API keys created yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2130] rounded-md text-xs">
                <span className="text-slate-200 flex-1">{k.name}</span>
                <span className="text-slate-500">{new Date(k.createdAt).toLocaleDateString()}</span>
                <button onClick={() => handleRevokeKey(k.id)} className="bg-none border-none text-red-500 cursor-pointer text-xs hover:text-red-400 flex-shrink-0">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div>
        <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
        <Card className="border border-red-500/30 py-4 px-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Delete Project</p>
              <p className="text-xs text-slate-500">Permanently delete this project and all its resources.</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
          </div>
        </Card>
      </div>

      {/* Add Env Var Modal */}
      <Modal isOpen={showAddEnv} onClose={() => setShowAddEnv(false)} title="Add Environment Variable" size="sm">
        <form onSubmit={handleAddEnv} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Key</label>
              <input
                value={envKey}
                onChange={e => setEnvKey(e.target.value.toUpperCase())}
                placeholder="API_KEY"
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Value</label>
              <input
                value={envValue}
                onChange={e => setEnvValue(e.target.value)}
                placeholder="secret-value"
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
            </div>
            {envError && <p className="text-red-400 text-xs">{envError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddEnv(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" loading={envSaving}>Save</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add API Key Modal */}
      <Modal isOpen={showAddKey} onClose={() => { setShowAddKey(false); setNewKey(null); setKeyName(''); }} title="New API Key" size="sm">
        <div className="space-y-4">
          {newKey ? (
            <div>
              <p className="text-xs text-slate-400 mb-2">Copy this key — it will not be shown again.</p>
              <div className="bg-[#080a0d] border border-[#1e2130] rounded px-3 py-2 font-mono text-xs text-slate-200 break-all">
                {newKey}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setShowAddKey(false); setNewKey(null); setKeyName(''); }}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAddKey} noValidate>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Key name</label>
                  <input
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                    placeholder="Production API Key"
                    className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddKey(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" type="submit" loading={keyCreating}>Create</Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Delete Project Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Project" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Type <span className="font-mono text-slate-200">{project.name}</span> to confirm deletion.
          </p>
          <input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder={project.name}
            className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              disabled={deleteConfirmText !== project.name}
              onClick={handleDeleteProject}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
