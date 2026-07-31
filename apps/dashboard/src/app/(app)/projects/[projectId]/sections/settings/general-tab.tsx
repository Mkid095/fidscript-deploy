'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy02Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import type { Project } from '@/types';

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

export function GeneralTab({ project }: { project: Project }) {
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
