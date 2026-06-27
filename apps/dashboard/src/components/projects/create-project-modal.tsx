'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

type ProjectType = 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'frontend', label: 'Frontend', description: 'Web app — static or SSR' },
  { value: 'backend', label: 'Backend', description: 'API + optional database' },
  { value: 'worker', label: 'Worker', description: 'Long-running background process' },
  { value: 'cron', label: 'Cron', description: 'Scheduled jobs' },
  { value: 'docker', label: 'Docker', description: 'Arbitrary container image' },
  { value: 'static', label: 'Static', description: 'Static file hosting' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const { getSdk } = useAuth();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false);
  const [type, setType] = useState<ProjectType>('frontend');
  const [description, setDescription] = useState('');
  const [checking, setChecking] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-generate slug from name when not locked.
  useEffect(() => {
    if (!open) return;
    if (!slugLocked) setSlug(slugify(name));
  }, [name, slugLocked, open]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setSlugLocked(false);
      setType('frontend');
      setDescription('');
      setChecking(false);
      setDuplicateError(null);
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [open]);

  // Focus name field when opened.
  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 50);
  }, [open]);

  // Debounced duplicate check.
  useEffect(() => {
    if (!open || !name.trim() || name.length < 3) { setDuplicateError(null); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const sdk = getSdk();
        const { projects } = await sdk.projects.list();
        const exists = projects.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
        setDuplicateError(exists ? `A project named "${name.trim()}" already exists.` : null);
      } catch { /* ignore */ } finally { setChecking(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [name, open, getSdk]);

  const canSubmit = !!name.trim() && name.length >= 3 && !checking && !duplicateError && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sdk = getSdk();
      const project = await sdk.projects.create({ name: name.trim(), type, slug: slug.trim() || undefined, description: description.trim() || undefined });
      onCreated(project);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create project');
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Create project" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-[var(--danger)]/30 text-sm text-[var(--danger)]">
            {submitError}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">
            Project name <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="relative">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-project"
              maxLength={40}
              className={`w-full bg-[var(--surface-2)] border text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] pr-16 ${
                duplicateError ? 'border-[var(--danger)]' : name && !checking && !duplicateError ? 'border-[var(--success)]/50' : 'border-[var(--rail)]'
              }`}
            />
            {checking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 border border-slate-500 border-t-blue-400 rounded-full animate-spin" />
              </div>
            )}
            {!checking && name && !duplicateError && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)] text-sm"></div>
            )}
          </div>
          {duplicateError && <p className="text-xs text-[var(--danger)] mt-1">{duplicateError}</p>}
          {!duplicateError && name && name.length < 3 && (
            <p className="text-xs text-[var(--text-muted)] mt-1">At least 3 characters</p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">
            URL slug
            <button
              type="button"
              onClick={() => {
                if (slugLocked) { setSlugLocked(false); setSlug(slugify(name)); }
                else setSlugLocked(true);
              }}
              className="ml-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]"
            >
              {slugLocked ? '🔒 locked' : 'auto'}
            </button>
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-project"
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">deploy.fidscript.com/{slug || '…'}</p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Project type</label>
          <div className="grid grid-cols-3 gap-2">
            {PROJECT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`p-2 rounded-lg border text-left transition ${
                  type === t.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]'
                    : 'border-[var(--rail)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--rail-light)]'
                }`}
                title={t.description}
              >
                <div className="text-xs font-medium">{t.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {PROJECT_TYPES.find(t => t.value === type)?.description}
          </p>
        </div>

        {/* Description */}
        <details className="group">
          <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-muted)] list-none flex items-center gap-1">
            <span className="text-[10px] group-open:hidden"></span>
            <span className="text-[10px] hidden group-open:inline"></span>
            Add description (optional)
          </summary>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this project do?"
            maxLength={200}
            rows={2}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] mt-2 resize-none"
          />
        </details>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit} loading={submitting}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
