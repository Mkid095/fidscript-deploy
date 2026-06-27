'use client';

/**
 * Project Settings — tabbed settings page (Vercel-style).
 *
 * Tabs:
 *   - General        — project name/description editing, subdomain display
 *   - Environment    — encrypted env vars with reveal/hide, add/edit/delete
 *   - API Keys       — project API keys (fpk_) for BaaS-style programmatic access
 *   - Build          — build config (strategy, build command, health checks, timeout)
 *   - Danger Zone    — delete project
 *
 * Env vars are stored encrypted (AES-256-GCM) on the backend; the API returns
 * decrypted values. We mask them by default in the UI and reveal on click.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Input, Spinner, Modal, Tabs, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  LockKeyIcon,
  SourceCodeIcon,
  Rocket01Icon,
  Delete01Icon,
  CheckmarkCircle02Icon,
  Copy02Icon,
  EyeIcon,
  EyeOffIcon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import type { Project } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnvVar { key: string; value: string; }
interface ApiKey { id: string; name: string; createdAt: string; lastUsedAt?: string; }
interface BuildConfig {
  strategy?: string;
  buildCommand?: string;
  outputDirectory?: string;
  healthCheckPath?: string;
  healthCheckPort?: number;
  startupTimeoutSeconds?: number;
}

type TabId = 'general' | 'environment' | 'apikeys' | 'build' | 'danger';

const TABS = [
  { id: 'general' as TabId, label: 'General', icon: <HugeiconsIcon icon={Settings01Icon} size={14} /> },
  { id: 'environment' as TabId, label: 'Environment', icon: <HugeiconsIcon icon={LockKeyIcon} size={14} /> },
  { id: 'apikeys' as TabId, label: 'API Keys', icon: <HugeiconsIcon icon={SourceCodeIcon} size={14} /> },
  { id: 'build' as TabId, label: 'Build', icon: <HugeiconsIcon icon={Rocket01Icon} size={14} /> },
  { id: 'danger' as TabId, label: 'Danger Zone', icon: <HugeiconsIcon icon={Delete01Icon} size={14} /> },
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props { project: Project }

export function SettingsSection({ project }: Props) {
  const [tab, setTab] = useState<TabId>('general');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage project configuration, environment, and security.</p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <Tabs tabs={TABS} value={tab} onChange={v => setTab(v as TabId)} />
      </div>

      {tab === 'general' && <GeneralTab project={project} />}
      {tab === 'environment' && <EnvironmentTab project={project} />}
      {tab === 'apikeys' && <ApiKeysTab project={project} />}
      {tab === 'build' && <BuildTab project={project} />}
      {tab === 'danger' && <DangerTab project={project} />}
    </div>
  );
}

// ── General Tab ───────────────────────────────────────────────────────────────

function GeneralTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState((project as any).description ?? '');
  const [saving, setSaving] = useState(false);
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'deploy.fidscript.com';
  const subdomain = `${project.slug}.apps.${platformDomain}`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await getSdk().projects.update(project.id, { name, description });
      showToast({ type: 'success', message: 'Project updated.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-[var(--rail)] p-5 space-y-5">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Project name</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project?" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>Save changes</Button>
      </form>

      <div className="border-t border-[var(--rail)] pt-4">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Deployment subdomain</label>
        <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
          <code className="text-sm font-mono text-[var(--accent)] flex-1 truncate">https://{subdomain}</code>
          <CopyButton text={`https://${subdomain}`} />
        </div>
        <p className="text-[10px] text-[var(--text-dim)] mt-1">All HTTP deployments of this project are served from this subdomain.</p>
      </div>
    </Card>
  );
}

// ── Environment Tab ───────────────────────────────────────────────────────────

function EnvironmentTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const vars = await getSdk().projects.getEnvVars(project.id);
      setEnvVars(Array.isArray(vars) ? vars : []);
    } catch {
      showToast({ type: 'error', message: 'Failed to load env vars' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      const varMap: Record<string, string> = {};
      for (const v of envVars) varMap[v.key] = v.value;
      varMap[newKey.trim().toUpperCase()] = newValue;
      await getSdk().projects.setEnvVars(project.id, varMap);
      setEnvVars(prev => [...prev, { key: newKey.trim().toUpperCase(), value: newValue }]);
      setNewKey(''); setNewValue(''); setShowAdd(false);
      showToast({ type: 'success', message: 'Environment variable added.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(key: string) {
    setSaving(true);
    try {
      const varMap: Record<string, string> = {};
      for (const v of envVars) varMap[v.key] = v.key === key ? editValue : v.value;
      await getSdk().projects.setEnvVars(project.id, varMap);
      setEnvVars(prev => prev.map(v => v.key === key ? { ...v, value: editValue } : v));
      setEditKey(null);
      showToast({ type: 'success', message: 'Environment variable updated.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(key: string) {
    try {
      await getSdk().projects.deleteEnvVar(project.id, key);
      setEnvVars(prev => prev.filter(v => v.key !== key));
      showToast({ type: 'success', message: 'Environment variable deleted.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Environment Variables</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Encrypted at rest (AES-256-GCM). Applied to all deployments.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>+ Add</Button>
        </div>

        {envVars.length === 0 ? (
          <EmptyState title="No environment variables" description="Add your first environment variable to configure your deployment." />
        ) : (
          <div className="space-y-1.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-medium">
              <span className="min-w-[140px]">Key</span>
              <span className="flex-1">Value</span>
              <span className="w-24" />
            </div>
            {envVars.map(env => (
              <div key={env.key} className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                <span className="text-xs font-mono text-[var(--text-muted)] min-w-[140px] truncate">{env.key}</span>
                {editKey === env.key ? (
                  <>
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                      className="flex-1 bg-[var(--surface-2)] border border-[var(--accent)]/50 text-[var(--text)] rounded px-2 py-1 text-xs font-mono min-w-0"
                    />
                    <button onClick={() => handleSaveEdit(env.key)} disabled={saving} className="text-xs text-[var(--success)] hover:text-[var(--success)] px-2 flex-shrink-0">Save</button>
                    <button onClick={() => setEditKey(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] px-1 flex-shrink-0">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono text-[var(--text)] flex-1 truncate">
                      {revealed[env.key] ? env.value : '••••••••••••'}
                    </span>
                    <button onClick={() => setRevealed(prev => ({ ...prev, [env.key]: !prev[env.key] }))} className="text-[var(--text-muted)] hover:text-[var(--text-muted)] p-1 flex-shrink-0" title={revealed[env.key] ? 'Hide' : 'Reveal'}>
                      <HugeiconsIcon icon={revealed[env.key] ? EyeOffIcon : EyeIcon} size={12} />
                    </button>
                    <button onClick={() => { setEditKey(env.key); setEditValue(env.value); }} className="text-xs text-[var(--accent)] hover:text-[var(--accent)] px-2 flex-shrink-0">Edit</button>
                    <button onClick={() => handleDelete(env.key)} className="text-xs text-[var(--danger)] hover:text-[var(--danger)] px-1 flex-shrink-0">Delete</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Environment Variable" size="sm">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Key</label>
            <Input value={newKey} onChange={e => setNewKey(e.target.value.toUpperCase())} placeholder="DATABASE_URL" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Value</label>
            <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="postgresql://..." className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getSdk().projects.listApiKeys(project.id);
      setKeys(result ?? []);
    } catch {
      showToast({ type: 'error', message: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const result = await getSdk().projects.createApiKey(project.id, keyName.trim()) as { apiKey: ApiKey; key: string };
      setNewKey(result.key);
      setKeys(prev => [...prev, result.apiKey]);
      setKeyName('');
      showToast({ type: 'success', message: 'API key created.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create key' });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? Any services using it will lose access immediately.')) return;
    try {
      await getSdk().projects.revokeApiKey(project.id, keyId);
      setKeys(prev => prev.filter(k => k.id !== keyId));
      showToast({ type: 'success', message: 'API key revoked.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to revoke' });
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Project API Keys</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Use the <code className="text-[var(--text-muted)]">X-API-Key</code> header for programmatic access.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setShowCreate(true); setNewKey(null); }}>+ New Key</Button>
        </div>

        {keys.length === 0 ? (
          <EmptyState title="No API keys" description="Create a key to access this project's services programmatically (storage, databases, logs, etc.)." />
        ) : (
          <div className="space-y-1.5">
            {keys.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                <HugeiconsIcon icon={SourceCodeIcon} size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] truncate">{k.name}</p>
                  <p className="text-[10px] text-[var(--text-dim)]">Created {new Date(k.createdAt).toLocaleDateString()}{k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ''}</p>
                </div>
                <button onClick={() => handleRevoke(k.id)} className="text-xs text-[var(--danger)] hover:text-[var(--danger)] flex-shrink-0">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {keys.length > 0 && (
        <Card className="border border-[var(--rail)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Usage</h3>
          <pre className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-3 text-[11px] font-mono text-[var(--text-muted)] overflow-x-auto"><code>{`curl -H "X-API-Key: fpk_..." \\
  https://api.deploy.fidscript.com/api/v1/projects/${project.id}/storage/buckets`}</code></pre>
        </Card>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setNewKey(null); setKeyName(''); }} title="New API Key" size="sm">
        {newKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--success)] text-sm">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
              Key created successfully
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2">️ Copy this key now — it will not be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded px-3 py-2 font-mono text-xs text-[var(--text)] break-all">{newKey}</code>
                <CopyButton text={newKey} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { setShowCreate(false); setNewKey(null); setKeyName(''); }}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Key name</label>
              <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Production Backend" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" loading={creating}>Create</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ── Build Config Tab ──────────────────────────────────────────────────────────

function BuildTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [config, setConfig] = useState<BuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const cfg = await getSdk().deployments.getBuildConfig(project.id);
      setConfig(cfg);
    } catch {
      showToast({ type: 'error', message: 'Failed to load build config' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const updated = await getSdk().deployments.updateBuildConfig(project.id, config);
      setConfig(updated);
      showToast({ type: 'success', message: 'Build config saved.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Card className="border border-[var(--rail)] p-5">
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Build Configuration</h2>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Strategy</label>
          <select
            value={config?.strategy ?? 'dockerfile'}
            onChange={e => setConfig(prev => prev ? { ...prev, strategy: e.target.value } : prev)}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="dockerfile">Dockerfile</option>
            <option value="buildpack">Buildpack</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Build command <span className="text-[var(--text-dim)] normal-case font-normal">(optional)</span></label>
          <Input value={config?.buildCommand ?? ''} onChange={e => setConfig(prev => prev ? { ...prev, buildCommand: e.target.value } : prev)} placeholder="npm run build" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Health check path</label>
            <Input value={config?.healthCheckPath ?? ''} onChange={e => setConfig(prev => prev ? { ...prev, healthCheckPath: e.target.value } : prev)} placeholder="/health" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Health check port</label>
            <Input type="number" value={config?.healthCheckPort ?? 3000} onChange={e => setConfig(prev => prev ? { ...prev, healthCheckPort: parseInt(e.target.value) || 3000 } : prev)} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Startup timeout (seconds)</label>
          <Input type="number" value={config?.startupTimeoutSeconds ?? 120} onChange={e => setConfig(prev => prev ? { ...prev, startupTimeoutSeconds: parseInt(e.target.value) || 120 } : prev)} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
          <p className="text-[10px] text-[var(--text-dim)] mt-1">How long to wait for the container to become healthy before marking the deployment as failed.</p>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>Save build config</Button>
      </form>
    </Card>
  );
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────

function DangerTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== project.name) return;
    setDeleting(true);
    try {
      await getSdk().projects.delete(project.id);
      window.location.href = '/projects';
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete project' });
      setDeleting(false);
    }
  }

  return (
    <Card className="border border-[var(--danger)]/30 p-5">
      <h2 className="text-sm font-semibold text-[var(--danger)] mb-3">Danger Zone</h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Delete this project</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Permanently deletes the project, all deployments, env vars, and API keys. This cannot be undone.</p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Project" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">Type <span className="font-mono text-[var(--text)]">{project.name}</span> to confirm deletion.</p>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={project.name} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={deleting} disabled={confirmText !== project.name} onClick={handleDelete}>Delete project</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-[var(--text-muted)] hover:text-[var(--text-muted)] p-1.5 rounded transition-colors flex-shrink-0"
      title="Copy"
      aria-label="Copy to clipboard"
    >
      <HugeiconsIcon icon={copied ? CheckmarkCircle02Icon : Copy02Icon} size={14} className={copied ? 'text-[var(--success)]' : ''} />
    </button>
  );
}
