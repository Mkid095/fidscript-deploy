'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Edit01Icon, Delete01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type ProjectType = 'frontend' | 'backend' | 'fullstack' | 'static' | 'api';
const PROJECT_TYPES: ProjectType[] = ['frontend', 'backend', 'fullstack', 'static', 'api'];

export default function ProjectsPage() {
  const { user, getSdk } = useAuth();
  const router = useRouter();

  // ── Data state ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Create modal state ──────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('frontend');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const slug = slugify(name);

  // ── Edit modal state ───────────────────────────────────────────────────
  const [editing, setEditing] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ProjectType>('frontend');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete confirm state ────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Permission helper ──────────────────────────────────────────────────
  const canMutate = (p: Project) =>
    ['owner', 'admin', 'developer'].includes(user?.role ?? '') ||
    p.role === 'owner' || p.role === 'admin' || p.role === 'developer';

  // ── Load projects ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        if (!cancelled) setProjects(Array.isArray(data) ? data : (data as any).projects ?? []);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getSdk]);

  // ── Create ─────────────────────────────────────────────────────────────
  function openCreate() {
    setName(''); setType('frontend'); setDescription(''); setCreateError(null);
    setShowCreate(true);
  }
  function closeCreate() {
    setShowCreate(false); setCreateError(null);
  }
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      });
      closeCreate();
      // ponytail: jump straight into the new project — the user just created
      // it, they want to see it, not bounce back to the list.
      router.push(`/projects/${created.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  function openEdit(p: Project) {
    setEditing(p);
    setEditName(p.name);
    setEditType((p.type as ProjectType) ?? 'frontend');
    setEditDescription('');
    setEditError(null);
  }
  function closeEdit() {
    setEditing(null); setEditError(null);
  }
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const sdk = getSdk();
      // ponytail: type is sent on update too; description only if non-empty so
      // the API doesn't clobber existing values with empty strings.
      // ponytail: type is sent on update too; description only if non-empty so
      // the API doesn't clobber existing values with empty strings.
      const trimmedDesc = editDescription.trim();
      await sdk.projects.update(editing.id, {
        name: editName.trim(),
        type: editType,
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
      });
      // Refresh list
      const data = await sdk.projects.list();
      setProjects(Array.isArray(data) ? data : (data as any).projects ?? []);
      closeEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function openDelete(p: Project) {
    setDeleting(p); setDeleteError(null);
  }
  function closeDelete() {
    setDeleting(null); setDeleteError(null);
  }
  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeletingNow(true);
    setDeleteError(null);
    try {
      const sdk = getSdk();
      await sdk.projects.delete(deleting.id);
      // ponytail: removing the project here does NOT cascade to its data
      // (deployments, env vars, etc.) — the API handles that server-side.
      // The SDK call returns void; the next list() call will exclude the
      // deleted project.
      const data = await sdk.projects.list();
      setProjects(Array.isArray(data) ? data : (data as any).projects ?? []);
      closeDelete();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingNow(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Projects</h1>
          <p className="text-sm text-slate-500">
            {projects.length === 0
              ? 'No projects yet'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canMutate({ role: user?.role } as Project) && (
          <Button variant="primary" size="sm" onClick={openCreate} className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Add01Icon} size={14} />
            New project
          </Button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-950/30 border border-red-800 rounded-lg p-3 mb-4 text-sm text-red-400 flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-red-300 hover:text-red-200 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && !loadError ? (
        <EmptyState
          icon={<HugeiconsIcon icon={Folder01Icon} size={48} className="text-slate-600" />}
          title="No projects yet"
          description="Create your first project to start deploying apps, databases, and more."
          action={
            canMutate({ role: user?.role } as Project) ? (
              <Button variant="primary" size="sm" onClick={openCreate} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Add01Icon} size={14} />
                Create your first project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => router.push(`/projects/${project.id}`)}
              onEdit={canMutate(project) ? () => openEdit(project) : undefined}
              onDelete={canMutate(project) ? () => openDelete(project) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <Modal isOpen={true} title="Create project" onClose={closeCreate}>
          <form id="create-form" onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Project name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-app"
              autoFocus
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />
            {name && (
              <p className="text-xs text-slate-500 -mt-2">
                Slug: <span className="font-mono text-slate-300">{slug}</span>
              </p>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ProjectType)}
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {PROJECT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <Input
              label="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this project do?"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            {createError && <p className="text-sm text-red-400">{createError}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={closeCreate}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={creating}
                disabled={!name.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <Modal isOpen={true} title={`Edit "${editing.name}"`} onClose={closeEdit}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Project name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={editType}
                onChange={e => setEditType(e.target.value as ProjectType)}
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {PROJECT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <Input
              label="Description"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder={editing.description ?? 'What does this project do?'}
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            {editError && <p className="text-sm text-red-400">{editError}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={closeEdit}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm modal ── */}
      {deleting && (
        <Modal isOpen={true} title="Delete project?" onClose={closeDelete}>
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Delete <strong className="text-slate-100">{deleting.name}</strong>?
              This will remove the project and all of its data: deployments,
              environment variables, secrets, and any associated storage.
            </p>
            <p className="text-xs text-amber-400">
              This action cannot be undone.
            </p>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={closeDelete}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                loading={deletingNow}
                className="flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={Delete01Icon} size={14} />
                {deletingNow ? 'Deleting…' : 'Delete project'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Project card ── */
interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProjectCard({ project, onOpen, onEdit, onDelete }: ProjectCardProps) {
  return (
    <div className="group relative rounded-lg border border-[#1e2130] bg-[#0f1117] hover:border-blue-500 transition-colors duration-150">
      {/* Main clickable area */}
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-blue-300 transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
              {project.slug}
            </p>
          </div>
          <span
            className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full border capitalize ${
              project.status === 'ACTIVE'
                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/60'
                : project.status === 'SUSPENDED'
                ? 'bg-amber-900/30 text-amber-400 border-amber-800/60'
                : 'bg-[#1e2130] text-slate-400 border-[#2a2d3a]'
            }`}
          >
            {project.status?.toLowerCase() ?? 'unknown'}
          </span>
        </div>

        {project.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs px-2 py-0.5 rounded bg-[#1e2130] text-slate-500 border border-[#2a2d3a] capitalize">
            {project.type}
          </span>
          <span className="text-xs text-slate-600">
            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '—'}
          </span>
        </div>
      </button>

      {/* Action buttons — only render if the user can mutate. Positioned
          absolutely so they don't shift the card layout. */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-[#1e2130] transition-colors"
              aria-label="Edit project"
              title="Edit"
            >
              <HugeiconsIcon icon={Edit01Icon} size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-[#1e2130] transition-colors"
              aria-label="Delete project"
              title="Delete"
            >
              <HugeiconsIcon icon={Delete01Icon} size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
