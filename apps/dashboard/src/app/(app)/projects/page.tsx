'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, Refresh01Icon, Time01Icon, EyeIcon, EyeOffIcon } from '@hugeicons/core-free-icons';
import { Button, Card, EmptyState, Input, RightPanel } from '@fidscript/ui';
import { AuthError, RateLimitError } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';
import { canEdit, canDelete, normalize, slugify } from './projects-utils';
import { ProjectCard } from './project-card';
import { DeletedProjectCard } from './deleted-project-card';
import { DeletePanel, PurgePanel } from './delete-panel';
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

  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (rateLimitTimerRef.current) { clearInterval(rateLimitTimerRef.current); rateLimitTimerRef.current = null; }
    setLoading(true); setLoadError(null); setRateLimitCountdown(null);
    let isRateLimit = false;
    try {
      const sdk = getSdk();
      const [activeData, deletedData] = await Promise.all([sdk.projects.list(), sdk.projects.list({ includeDeleted: true })]);
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
          if (remaining <= 0 && rateLimitTimerRef.current) { clearInterval(rateLimitTimerRef.current); rateLimitTimerRef.current = null; }
        }, 1000);
        setLoadError(`Rate limited. Retrying in ${remaining}s…`); return;
      }
      if (!isRateLimit) setLoadError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [getSdk, router]);

  useEffect(() => () => { abortRef.current?.abort(); if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current); }, []);
  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({ name: name.trim(), description: description.trim() || undefined, type: 'frontend' });
      setActivePanel(null);
      router.push(`/projects/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setCreateError('Rate limited. Please wait a moment and try again.'); return; }
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally { setCreating(false); }
  }

  async function handleSaveEdit() {
    if (!editing || !editName.trim()) return;
    setSavingEdit(true); setEditError(null);
    try {
      const sdk = getSdk();
      const trimmedDesc = editDescription.trim();
      await sdk.projects.update(editing.id, { name: editName.trim(), type: editType, ...(trimmedDesc ? { description: trimmedDesc } : {}) });
      setActivePanel(null); await load();
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setEditError('Rate limited. Please wait a moment and try again.'); return; }
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSavingEdit(false); }
  }

  async function handleConfirmDelete() {
    if (!deleting || !deleteAck) return;
    setDeletingNow(true); setDeleteError(null);
    try { const sdk = getSdk(); await sdk.projects.delete(deleting.id); setActivePanel(null); await load(); }
    catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setDeleteError('Rate limited. Please wait a moment and try again.'); return; }
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally { setDeletingNow(false); }
  }

  async function handleRequestPurge() {
    if (!purgeProject) return;
    setPurgeVerifying(true); setPurgeError(null);
    try { const sdk = getSdk(); await sdk.projects.requestPurge(purgeProject.id); setPurgeRequested(true); }
    catch (err) { setPurgeError(err instanceof Error ? err.message : 'Failed to send verification code'); }
    finally { setPurgeVerifying(false); }
  }

  async function handleConfirmPurge() {
    if (!purgeProject || !purgeCode.trim()) return;
    setPurgeVerifying(true); setPurgeError(null);
    try { const sdk = getSdk(); await sdk.projects.purge(purgeProject.id, purgeCode.trim()); setActivePanel(null); await load(); }
    catch (err) { setPurgeError(err instanceof Error ? err.message : 'Invalid or expired code'); }
    finally { setPurgeVerifying(false); }
  }

  async function handleRestore(p: Project) { try { const sdk = getSdk(); await sdk.projects.restore(p.id); await load(); } catch {} }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set('q', value.trim()); else params.delete('q');
      router.replace(`${location.pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  }

  const q = normalize(search);
  const filtered = q ? projects.filter(p => normalize(p.name).includes(q) || normalize(p.slug).includes(q) || normalize(p.description ?? '').includes(q)) : projects;
  const u = user?.role;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">{u ? `Welcome back, ${u}` : 'Projects'}</h1>
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
          <Button variant="ghost" size="sm" onClick={load} title="Refresh" aria-label="Refresh" disabled={loading}><HugeiconsIcon icon={Refresh01Icon} size={14} /></Button>
          {deletedProjects.length > 0 && (
            <Button variant={showDeleted ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowDeleted(v => !v)} aria-label="Toggle deleted projects">
              <HugeiconsIcon icon={showDeleted ? EyeOffIcon : EyeIcon} size={14} />
              {deletedProjects.length > 0 && <span className="ml-1 text-xs text-[var(--text-muted)]">{deletedProjects.length}</span>}
            </Button>
          )}
          {canEdit(u) && (
            <Button variant="primary" size="sm" onClick={() => { setName(''); setDescription(''); setCreateError(null); setActivePanel('create'); }} className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Add01Icon} size={14} /> New project
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

      {loading ? <SkeletonGrid /> :
       projects.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-[var(--text-dim)]" />}
            title={canEdit(u) ? 'No projects yet' : 'No projects'}
            description={canEdit(u) ? 'Create your first project to start deploying apps, databases, and more.' : 'No projects have been created yet.'}
            action={canEdit(u) ? <Button variant="primary" size="sm" onClick={() => { setName(''); setDescription(''); setCreateError(null); setActivePanel('create'); }} className="flex items-center gap-1.5"><HugeiconsIcon icon={Add01Icon} size={14} /> Create your first project</Button> : undefined} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-[var(--text-dim)]" />} title="No matches" description={`No projects match "${search}".`}
            action={<Button variant="ghost" size="sm" onClick={() => { setSearch(''); router.replace('/projects', { scroll: false }); }}>Clear search</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite" aria-label="Projects list">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onOpen={() => router.push(`/projects/${p.slug}`)}
              onEdit={canEdit(u, p.role) ? () => { setEditing(p); setEditName(p.name); setEditType(p.type as typeof editType); setEditDescription(p.description ?? ''); setEditError(null); setActivePanel('edit'); } : undefined}
              onDelete={canDelete(u, p.role) ? () => { setDeleting(p); setDeleteAck(false); setDeleteError(null); setActivePanel('delete'); } : undefined} />
          ))}
        </div>
      )}

      {showDeleted && deletedProjects.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">Deleted projects</h2>
            <span className="text-xs text-[var(--text-muted)]">{deletedProjects.length} item{deletedProjects.length !== 1 ? 's' : ''} · purged after 30 days</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deletedProjects.map(p => (
              <DeletedProjectCard key={p.id} project={p}
                onRestore={canDelete(u, p.role) ? () => handleRestore(p) : undefined}
                onPurge={canDelete(u, p.role) ? () => { setPurgeProject(p); setPurgeCode(''); setPurgeRequested(false); setPurgeError(null); setActivePanel('purge'); } : undefined} />
            ))}
          </div>
        </div>
      )}

      <RightPanel isOpen={activePanel === 'create'} onClose={() => setActivePanel(null)} title="New project"
        subtitle="Pick a name. Configure everything else from the dashboard."
        footer={{ onCancel: () => setActivePanel(null), onSubmit: handleCreate, submitLabel: 'Create project', loading: creating, submitDisabled: !name.trim() }}>
        <ProjectForm name={name} onNameChange={setName} description={description} onDescriptionChange={setDescription} slug={slug} error={createError} />
      </RightPanel>

      <RightPanel isOpen={activePanel === 'edit' && !!editing} onClose={() => setActivePanel(null)}
        title={editing ? `Edit "${editing.name}"` : 'Edit project'} subtitle="Changes save immediately."
        footer={{ onCancel: () => setActivePanel(null), onSubmit: handleSaveEdit, submitLabel: 'Save changes', loading: savingEdit, submitDisabled: !editName.trim() }}>
        {editing && (
          <ProjectForm name={editName} onNameChange={setEditName} type={editType} onTypeChange={v => setEditType(v)}
            description={editDescription} onDescriptionChange={setEditDescription} slug="" error={editError}
            descriptionPlaceholder={editing.description ?? 'What does this project do?'} nameLabel="Project name" showType slugLabel={editing.slug} />
        )}
      </RightPanel>

      <DeletePanel deleting={activePanel === 'delete' && !!deleting ? deleting : null} deleteAck={deleteAck} deletingNow={deletingNow}
        deleteError={deleteError} onAckChange={setDeleteAck} onConfirm={handleConfirmDelete} onCancel={() => setActivePanel(null)} />

      <PurgePanel purgeProject={activePanel === 'purge' && !!purgeProject ? purgeProject : null} purgeCode={purgeCode} purgeRequested={purgeRequested}
        purgeVerifying={purgeVerifying} purgeError={purgeError} onCodeChange={setPurgeCode}
        onRequest={handleRequestPurge} onConfirm={handleConfirmPurge} onCancel={() => setActivePanel(null)} />
    </div>
  );
}
