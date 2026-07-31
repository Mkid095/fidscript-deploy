'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Search01Icon,
  Refresh01Icon,
  AlertCircleIcon,
  Time01Icon,
  EyeIcon,
  EyeOffIcon,
} from '@hugeicons/core-free-icons';
import { Button, Card, EmptyState, Input, RightPanel } from '@fidscript/ui';
import { AuthError, RateLimitError } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';
import { canEdit, canDelete, normalize, relativeTime, slugify } from './projects-utils';
import { ProjectCard, DeletedProjectCard } from './project-card';
import { SkeletonGrid } from './projects-skeleton';
import { ProjectForm } from './project-form';

export default function ProjectsPage() {
  const { user, getSdk } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activePanel, setActivePanel] = useState<'create' | 'edit' | 'delete' | 'purge' | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static'>('frontend');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteAck, setDeleteAck] = useState(false);
  const [deletingNow, setDeletingNow] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [purgeProject, setPurgeProject] = useState<Project | null>(null);
  const [purgeCode, setPurgeCode] = useState('');
  const [purgeRequested, setPurgeRequested] = useState(false);
  const [purgeVerifying, setPurgeVerifying] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const slug = slugify(name);

  // Load
  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (rateLimitTimerRef.current) {
      clearInterval(rateLimitTimerRef.current);
      rateLimitTimerRef.current = null;
    }
    setLoading(true);
    setLoadError(null);
    setRateLimitCountdown(null);

    let isRateLimit = false;
    try {
      const sdk = getSdk();
      const [activeData, deletedData] = await Promise.all([
        sdk.projects.list(),
        sdk.projects.list({ includeDeleted: true }),
      ]);
      setProjects((activeData.projects ?? []).filter((p: Project) => !p.deletedAt));
      setDeletedProjects((deletedData.projects ?? []).filter((p: Project) => !!p.deletedAt));
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError && err.retryAfterMs) {
        isRateLimit = true;
        let remaining = Math.ceil(err.retryAfterMs / 1000);
        setRateLimitCountdown(remaining);
        rateLimitTimerRef.current = setInterval(() => {
          remaining -= 1;
          setRateLimitCountdown(remaining > 0 ? remaining : null);
          if (remaining <= 0 && rateLimitTimerRef.current) {
            clearInterval(rateLimitTimerRef.current);
            rateLimitTimerRef.current = null;
          }
        }, 1000);
        setLoadError(`Rate limited. Retrying in ${remaining}s…`);
        return;
      }
      if (!isRateLimit) setLoadError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [getSdk, router]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (rateLimitTimerRef.current) { clearInterval(rateLimitTimerRef.current); rateLimitTimerRef.current = null; }
    };
  }, []);

  useEffect(() => { load(); }, [load]);

  // Create
  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({ name: name.trim(), description: description.trim() || undefined, type: 'frontend' });
      setActivePanel(null);
      router.push(`/projects/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setCreateError('Rate limited. Please wait a moment and try again.'); return; }
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  // Edit
  async function handleSaveEdit() {
    if (!editing || !editName.trim()) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const sdk = getSdk();
      const trimmedDesc = editDescription.trim();
      await sdk.projects.update(editing.id, { name: editName.trim(), type: editType, ...(trimmedDesc ? { description: trimmedDesc } : {}) });
      setActivePanel(null);
      await load();
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setEditError('Rate limited. Please wait a moment and try again.'); return; }
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete
  async function handleConfirmDelete() {
    if (!deleting || !deleteAck) return;
    setDeletingNow(true);
    setDeleteError(null);
    try {
      const sdk = getSdk();
      await sdk.projects.delete(deleting.id);
      setActivePanel(null);
      await load();
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setDeleteError('Rate limited. Please wait a moment and try again.'); return; }
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingNow(false);
    }
  }

  // Purge
  async function handleRequestPurge() {
    if (!purgeProject) return;
    setPurgeVerifying(true);
    setPurgeError(null);
    try {
      const sdk = getSdk();
      await sdk.projects.requestPurge(purgeProject.id);
      setPurgeRequested(true);
    } catch (err) {
      setPurgeError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setPurgeVerifying(false);
    }
  }

  async function handleConfirmPurge() {
    if (!purgeProject || !purgeCode.trim()) return;
    setPurgeVerifying(true);
    setPurgeError(null);
    try {
      const sdk = getSdk();
      await sdk.projects.purge(purgeProject.id, purgeCode.trim());
      setActivePanel(null);
      await load();
    } catch (err) {
      setPurgeError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setPurgeVerifying(false);
    }
  }

  // Restore
  async function handleRestore(p: Project) {
    try { const sdk = getSdk(); await sdk.projects.restore(p.id); await load(); } catch {}
  }

  // Search
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set('q', value.trim()); else params.delete('q');
      router.replace(`${location.pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  }

  // Filter
  const q = normalize(search);
  const filtered = q
    ? projects.filter(p => normalize(p.name).includes(q) || normalize(p.slug).includes(q) || normalize(p.description ?? '').includes(q))
    : projects;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">
            {user?.name ? `Welcome back, ${user.name}` : 'Projects'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
            {loading ? 'Loading…' : q ? `${filtered.length} of ${projects.length} projects` : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1 max-w-xs">
            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
            <Input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Search projects…" aria-label="Search projects"
              className="pl-9 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
          </div>
          <Button variant="ghost" size="sm" onClick={load} title="Refresh" aria-label="Refresh" disabled={loading}>
            <HugeiconsIcon icon={Refresh01Icon} size={14} />
          </Button>
          {deletedProjects.length > 0 && (
            <Button variant={showDeleted ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowDeleted(v => !v)} title="Deleted projects" aria-label="Toggle deleted projects">
              <HugeiconsIcon icon={showDeleted ? EyeOffIcon : EyeIcon} size={14} />
              {deletedProjects.length > 0 && <span className="ml-1 text-xs text-[var(--text-muted)]">{deletedProjects.length}</span>}
            </Button>
          )}
          {canEdit(user?.role) && (
            <Button variant="primary" size="sm" onClick={() => { setName(''); setDescription(''); setCreateError(null); setActivePanel('create'); }} className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Add01Icon} size={14} />
              New project
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-3 mb-4 text-sm text-[var(--danger)] flex items-center justify-between">
          <span className="flex items-center gap-2">
            {rateLimitCountdown !== null && <HugeiconsIcon icon={Time01Icon} size={14} className="text-[var(--warning)] flex-shrink-0" />}
            {loadError}
          </span>
          {!rateLimitCountdown && <button onClick={load} className="text-xs text-[var(--danger)] hover:text-red-200 underline">Retry</button>}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <SkeletonGrid />
      ) : projects.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-[var(--text-dim)]" />}
            title={canEdit(user?.role) ? 'No projects yet' : 'No projects'}
            description={canEdit(user?.role) ? 'Create your first project to start deploying apps, databases, and more.' : 'No projects have been created yet. Contact your project owner to get access.'}
            action={canEdit(user?.role) ? (
              <Button variant="primary" size="sm" onClick={() => { setName(''); setDescription(''); setCreateError(null); setActivePanel('create'); }} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Add01Icon} size={14} /> Create your first project
              </Button>
            ) : undefined} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-[var(--text-dim)]" />} title="No matches" description={`No projects match "${search}".`}
            action={<Button variant="ghost" size="sm" onClick={() => { setSearch(''); router.replace('/projects', { scroll: false }); }}>Clear search</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite" aria-label="Projects list">
          {filtered.map(project => (
            <ProjectCard key={project.id} project={project}
              onOpen={() => router.push(`/projects/${project.slug}`)}
              onEdit={canEdit(user?.role, project.role) ? () => { setEditing(project); setEditName(project.name); setEditType(project.type as typeof editType); setEditDescription(project.description ?? ''); setEditError(null); setActivePanel('edit'); } : undefined}
              onDelete={canDelete(user?.role, project.role) ? () => { setDeleting(project); setDeleteAck(false); setDeleteError(null); setActivePanel('delete'); } : undefined} />
          ))}
        </div>
      )}

      {/* Trash section */}
      {showDeleted && deletedProjects.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">Deleted projects</h2>
            <span className="text-xs text-[var(--text-muted)]">{deletedProjects.length} item{deletedProjects.length !== 1 ? 's' : ''} · purged after 30 days</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite" aria-label="Deleted projects">
            {deletedProjects.map(project => (
              <DeletedProjectCard key={project.id} project={project}
                onRestore={canDelete(user?.role, project.role) ? () => handleRestore(project) : undefined}
                onPurge={canDelete(user?.role, project.role) ? () => { setPurgeProject(project); setPurgeCode(''); setPurgeRequested(false); setPurgeError(null); setActivePanel('purge'); } : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Right panel: Create */}
      <RightPanel isOpen={activePanel === 'create'} onClose={() => setActivePanel(null)} title="New project"
        subtitle="Pick a name. You can configure everything else from the dashboard."
        footer={{ onCancel: () => setActivePanel(null), onSubmit: handleCreate, submitLabel: 'Create project', loading: creating, submitDisabled: !name.trim() }}>
        <ProjectForm name={name} onNameChange={setName} description={description} onDescriptionChange={setDescription} slug={slug} error={createError} />
      </RightPanel>

      {/* Right panel: Edit */}
      <RightPanel isOpen={activePanel === 'edit' && !!editing} onClose={() => setActivePanel(null)}
        title={editing ? `Edit "${editing.name}"` : 'Edit project'} subtitle="Changes save immediately to this project only."
        footer={{ onCancel: () => setActivePanel(null), onSubmit: handleSaveEdit, submitLabel: 'Save changes', loading: savingEdit, submitDisabled: !editName.trim() }}>
        {editing && (
          <ProjectForm name={editName} onNameChange={setEditName} type={editType} onTypeChange={v => setEditType(v)} description={editDescription} onDescriptionChange={setEditDescription}
            slug="" error={editError} descriptionPlaceholder={editing.description ?? 'What does this project do?'} nameLabel="Project name" showType slugLabel={editing.slug} />
        )}
      </RightPanel>

      {/* Right panel: Delete */}
      <RightPanel isOpen={activePanel === 'delete' && !!deleting} onClose={() => setActivePanel(null)} title="Delete project?"
        footer={{ onCancel: () => setActivePanel(null), onSubmit: handleConfirmDelete, submitLabel: 'Delete project', loading: deletingNow, submitDisabled: !deleteAck, submitDanger: true, hideCancel: false }}>
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">You are about to permanently delete <strong className="text-[var(--text)]">{deleting.name}</strong>. This will remove the project and all data, which cannot be recovered:</p>
            <ul className="space-y-1.5 text-sm text-[var(--text-muted)] ml-1">
              {['Deployments and release history', 'Environment variables and secrets', 'Database instances and backups', 'Storage buckets and uploaded files', 'Email mailboxes, aliases, and messages', 'Custom domains and DNS records'].map(item => (
                <li key={item} className="flex items-center gap-2"><HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-[var(--danger)] flex-shrink-0" /> {item}</li>
              ))}
            </ul>
            <label className="flex items-start gap-2 pt-3 border-t border-[var(--rail)] cursor-pointer">
              <input type="checkbox" checked={deleteAck} onChange={e => setDeleteAck(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-[var(--rail)] text-[var(--danger)] focus:ring-[var(--danger)] focus:ring-offset-0" />
              <span className="text-sm text-[var(--text-muted)]">I understand this will permanently delete <strong className="text-[var(--text)]">{deleting.name}</strong> and all of its data.</span>
            </label>
            {deleteError && <p className="text-sm text-[var(--danger)]">{deleteError}</p>}
          </div>
        )}
      </RightPanel>

      {/* Right panel: Purge */}
      <RightPanel isOpen={activePanel === 'purge' && !!purgeProject} onClose={() => setActivePanel(null)} title="Permanently delete?"
        footer={{ onCancel: () => setActivePanel(null), onSubmit: purgeRequested ? handleConfirmPurge : handleRequestPurge,
          submitLabel: purgeRequested ? 'Delete permanently' : 'Send verification code', loading: purgeVerifying, submitDisabled: purgeRequested && !purgeCode.trim(), submitDanger: true, hideCancel: false }}>
        {purgeProject && (
          <div className="space-y-4">
            {!purgeRequested ? (
              <>
                <p className="text-sm text-[var(--text-muted)]">Permanently deleting <strong className="text-[var(--text)]">{purgeProject.name}</strong> cannot be undone. A verification code will be sent to your email address.</p>
                <div className="bg-amber-950/30 border border-[var(--warning)]/30/50 rounded-lg p-3 text-xs text-[var(--warning)]">This project will be permanently removed along with all deployments, databases, and storage.</div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)]">A verification code was sent to your email. Enter it below to confirm permanent deletion of <strong className="text-[var(--text)]">{purgeProject.name}</strong>.</p>
                <Input label="Verification code" value={purgeCode} onChange={e => setPurgeCode(e.target.value)} placeholder="000000" autoFocus className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] font-mono text-center text-lg tracking-widest" />
                <p className="text-xs text-[var(--text-muted)]">Didn&apos;t receive it? <button onClick={handleRequestPurge} disabled={purgeVerifying} className="text-[var(--accent)] hover:text-[var(--accent)] underline disabled:opacity-50">Resend</button></p>
              </>
            )}
            {purgeError && <p className="text-sm text-[var(--danger)]">{purgeError}</p>}
          </div>
        )}
      </RightPanel>
    </div>
  );
}
