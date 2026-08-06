// useProjectsPage — all state + handlers for the projects page

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Project } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { AuthError, RateLimitError } from '@fidscript-deploy/sdk';

type ProjectType = 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';

export function useProjectsPage(getSdk: () => FidscriptSDK) {
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
  const [editType, setEditType] = useState<ProjectType>('frontend');
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
      const created = await getSdk().projects.create({ name: name.trim(), description: description.trim() || undefined, type: 'frontend' });
      // Redirect by slug for prettier URLs (/projects/my-project); API also accepts UUID for back-compat.
      setActivePanel(null); router.push(`/projects/${created.slug ?? created.id}`);
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setCreateError('Rate limited. Please wait.'); return; }
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally { setCreating(false); }
  }

  async function handleSaveEdit() {
    if (!editing || !editName.trim()) return;
    setSavingEdit(true); setEditError(null);
    try {
      await getSdk().projects.update(editing.id, { name: editName.trim(), type: editType, ...(editDescription.trim() ? { description: editDescription.trim() } : {}) });
      setActivePanel(null); await load();
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setEditError('Rate limited. Please wait.'); return; }
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSavingEdit(false); }
  }

  async function handleConfirmDelete() {
    if (!deleting || !deleteAck) return;
    setDeletingNow(true); setDeleteError(null);
    try { await getSdk().projects.delete(deleting.id); setActivePanel(null); await load(); }
    catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setDeleteError('Rate limited. Please wait.'); return; }
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally { setDeletingNow(false); }
  }

  async function handleRequestPurge() {
    if (!purgeProject) return;
    setPurgeVerifying(true); setPurgeError(null);
    try { await getSdk().projects.requestPurge(purgeProject.id); setPurgeRequested(true); }
    catch (err) { setPurgeError(err instanceof Error ? err.message : 'Failed to send verification code'); }
    finally { setPurgeVerifying(false); }
  }

  async function handleConfirmPurge() {
    if (!purgeProject || !purgeCode.trim()) return;
    setPurgeVerifying(true); setPurgeError(null);
    try { await getSdk().projects.purge(purgeProject.id, purgeCode.trim()); setActivePanel(null); await load(); }
    catch (err) { setPurgeError(err instanceof Error ? err.message : 'Invalid or expired code'); }
    finally { setPurgeVerifying(false); }
  }

  async function handleRestore(p: Project) {
    try {
      await getSdk().projects.restore(p.id);
      await load();
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { return; }
      setLoadError(err instanceof Error ? err.message : 'Failed to restore project');
    }
  }

  function handleEditOpen(p: Project) {
    setEditing(p); setEditName(p.name); setEditType(p.type as ProjectType); setEditDescription(p.description ?? ''); setEditError(null); setActivePanel('edit');
  }

  function handleDeleteOpen(p: Project) {
    setDeleting(p); setDeleteAck(false); setDeleteError(null); setActivePanel('delete');
  }

  function handlePurgeOpen(p: Project) {
    setPurgeProject(p); setPurgeCode(''); setPurgeRequested(false); setPurgeError(null); setActivePanel('purge');
  }

  function handleCreateOpen() {
    setName(''); setDescription(''); setCreateError(null); setActivePanel('create');
  }

  function handleClearSearch() {
    setSearch(''); router.replace('/projects', { scroll: false });
  }

  return {
    projects, loading, loadError, showDeleted, deletedProjects, search, rateLimitCountdown,
    activePanel, editing, deleting, name, description, creating, createError,
    editName, editType, editDescription, savingEdit, editError,
    deleteAck, deletingNow, deleteError,
    purgeProject, purgeCode, purgeRequested, purgeVerifying, purgeError,
    setShowDeleted, setActivePanel, setEditing, setDeleting, setName, setDescription,
    setCreating, setCreateError, setEditName, setEditType, setEditDescription,
    setSavingEdit, setEditError, setDeleteAck, setDeletingNow, setDeleteError,
    setPurgeProject, setPurgeCode, setPurgeRequested,
    load, handleSearchChange, handleCreate, handleSaveEdit, handleConfirmDelete,
    handleRequestPurge, handleConfirmPurge, handleRestore,
    handleEditOpen, handleDeleteOpen, handlePurgeOpen, handleCreateOpen, handleClearSearch,
  };
}
