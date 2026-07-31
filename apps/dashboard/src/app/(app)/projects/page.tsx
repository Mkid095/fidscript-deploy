'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Time01Icon } from '@hugeicons/core-free-icons';
import { Button, RightPanel } from '@fidscript/ui';
import { AuthError, RateLimitError } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';
import { canEdit, slugify } from './projects-utils';
import { DeletePanel, PurgePanel } from './delete-panel';
import { ProjectsListHeader } from './projects-list-header';
import { ProjectsListBody } from './projects-list-body';
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
  const u = user?.role;

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
    } finally { setLoading(false); }
  }, [getSdk, router]);

  useEffect(() => () => { abortRef.current?.abort(); if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current); }, []);
  useEffect(() => { load(); }, [load]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set('q', value.trim()); else params.delete('q');
      router.replace(`${location.pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({ name: name.trim(), description: description.trim() || undefined, type: 'frontend' });
      setActivePanel(null); router.push(`/projects/${created.id}`);
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
      await sdk.projects.update(editing.id, { name: editName.trim(), type: editType, ...(editDescription.trim() ? { description: editDescription.trim() } : {}) });
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

  return (
    <div className="max-w-6xl mx-auto">
      {loadError && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-3 mb-4 text-sm text-[var(--danger)] flex items-center justify-between">
          <span className="flex items-center gap-2">
            {rateLimitCountdown !== null && <HugeiconsIcon icon={Time01Icon} size={14} className="text-[var(--warning)] flex-shrink-0" />}
            {loadError}
          </span>
          {!rateLimitCountdown && <button onClick={load} className="text-xs text-[var(--danger)] hover:text-red-200 underline">Retry</button>}
        </div>
      )}

      <ProjectsListHeader
        userName={user?.name} search={search} loading={loading} deletedCount={deletedProjects.length}
        showDeleted={showDeleted} filteredCount={search ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length : projects.length}
        totalCount={projects.length} canCreate={canEdit(u)}
        onSearchChange={handleSearchChange} onRefresh={load}
        onToggleDeleted={() => setShowDeleted(v => !v)}
        onCreate={() => { setName(''); setDescription(''); setCreateError(null); setActivePanel('create'); }}
      />

      <ProjectsListBody
        userRole={u} projects={projects} deletedProjects={deletedProjects}
        loading={loading} showDeleted={showDeleted} search={search}
        onEdit={(p) => { setEditing(p); setEditName(p.name); setEditType(p.type as typeof editType); setEditDescription(p.description ?? ''); setEditError(null); setActivePanel('edit'); }}
        onDelete={(p) => { setDeleting(p); setDeleteAck(false); setDeleteError(null); setActivePanel('delete'); }}
        onRestore={handleRestore}
        onPurge={(p) => { setPurgeProject(p); setPurgeCode(''); setPurgeRequested(false); setPurgeError(null); setActivePanel('purge'); }}
        onClearSearch={() => { setSearch(''); router.replace('/projects', { scroll: false }); }}
      />

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

      <DeletePanel deleting={activePanel === 'delete' && !!deleting ? deleting : null}
        deleteAck={deleteAck} deletingNow={deletingNow} deleteError={deleteError}
        onAckChange={setDeleteAck} onConfirm={handleConfirmDelete} onCancel={() => setActivePanel(null)} />

      <PurgePanel purgeProject={activePanel === 'purge' && !!purgeProject ? purgeProject : null}
        purgeCode={purgeCode} purgeRequested={purgeRequested} purgeVerifying={purgeVerifying} purgeError={purgeError}
        onCodeChange={setPurgeCode} onRequest={handleRequestPurge} onConfirm={handleConfirmPurge} onCancel={() => setActivePanel(null)} />
    </div>
  );
}
