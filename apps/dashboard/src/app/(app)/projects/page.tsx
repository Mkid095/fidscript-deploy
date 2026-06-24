'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Edit01Icon,
  Delete01Icon,
  Folder01Icon,
  Search01Icon,
  Refresh01Icon,
  AlertCircleIcon,
  Time01Icon,
} from '@hugeicons/core-free-icons';
import { Button, Card, EmptyState, Input, RightPanel, Spinner } from '@fidscript/ui';
import { AuthError, RateLimitError } from '@fidscript/sdk';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

// Must match the Prisma ProjectType enum exactly (API rejects anything else).
// FRONTEND | BACKEND | WORKER | CRON | DOCKER | STATIC
type ProjectType = 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';
const PROJECT_TYPES: ProjectType[] = ['frontend', 'backend', 'worker', 'cron', 'docker', 'static'];

// Universal status palette per ADR-036 principle 7.
// Maps every ProjectStatus value to a visible style.
const STATUS_PALETTE: Record<string, string> = {
  ACTIVE: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/60',
  HEALTHY: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/60',
  RUNNING: 'bg-blue-900/30 text-blue-400 border-blue-800/60',
  PENDING: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/60',
  WARNING: 'bg-orange-900/30 text-orange-400 border-orange-800/60',
  SUSPENDED: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/60',
  FAILED: 'bg-red-900/30 text-red-400 border-red-800/60',
  STOPPED: 'bg-slate-800 text-slate-400 border-slate-700',
  CREATING: 'bg-blue-900/30 text-blue-300 border-blue-800/60',
  ARCHIVED: 'bg-purple-900/30 text-purple-300 border-purple-800/60',
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Unicode NFC normalization — ensures "café" and "café" match the same way. */
function normalize(str: string): string {
  return str.trim().toLowerCase().normalize('NFC');
}
function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ProjectsPage() {
  const { user, getSdk } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Debounce timer for URL sync — avoids flooding the URL on rapid keystrokes.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data state ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  // Rate-limit countdown shown in the load error banner.
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Right-panel state (ADR-036 principle 12) ──────────────────────────
  // ponytail: one open at a time. The previous <Modal> design had three
  // modals with separate state; collapsing to a single "active panel" state
  // is fewer lines and impossible-to-misuse (only one is open at a time).
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  // Create fields — name-only: type is set by the server, user edits it later if they want
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const slug = slugify(name);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ProjectType>('frontend');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete fields — destructive confirm requires an explicit "I understand" tick
  const [deleteAck, setDeleteAck] = useState(false);
  const [deletingNow, setDeletingNow] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API contract: PATCH requires admin/owner; DELETE requires owner only.
  // Developer can see + navigate; cannot edit or delete.
  const canEdit = (p?: Project) =>
    (user?.role === 'owner' || user?.role === 'admin') ||
    (p && (p.role === 'owner' || p.role === 'admin'));
  // Delete is owner-only (API enforces this server-side too).
  const canDelete = (p?: Project) =>
    (user?.role === 'owner') || (p && p.role === 'owner');

  // ── Load ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    // Clear any previous rate-limit countdown.
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
      const data = await sdk.projects.list();
      const list = Array.isArray(data) ? data : (data as any).projects ?? [];
      // Filter DELETED — soft-delete sets status, not remove the row.
      // The API doesn't filter them server-side, so we do it client-side.
      setProjects(list.filter((p: Project) => p.status !== 'DELETED'));
    } catch (err) {
      if (err instanceof AuthError) {
        router.replace('/login');
        return;
      }
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
      if (!isRateLimit) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load projects');
      }
    } finally {
      setLoading(false);
      setLoadingInitial(false);
    }
  }, [getSdk, router]);

  // Cleanup on unmount: cancel any pending request and clear rate-limit timer.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (rateLimitTimerRef.current) {
        clearInterval(rateLimitTimerRef.current);
        rateLimitTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create ─────────────────────────────────────────────────────────────
  function openCreate() {
    setName(''); setDescription(''); setCreateError(null);
    setActivePanel('create');
  }
  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setActivePanel(null);
      // ponytail: jump straight into the new project — the user just created
      // it, they want to see it, not bounce back to the list.
      router.push(`/projects/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) {
        router.replace('/login');
        return;
      }
      if (err instanceof RateLimitError) {
        setCreateError('Rate limited. Please wait a moment and try again.');
        return;
      }
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
    setEditDescription(p.description ?? '');
    setEditError(null);
    setActivePanel('edit');
  }
  async function handleSaveEdit() {
    if (!editing || !editName.trim()) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const sdk = getSdk();
      const trimmedDesc = editDescription.trim();
      await sdk.projects.update(editing.id, {
        name: editName.trim(),
        type: editType,
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
      });
      setActivePanel(null);
      await load();
    } catch (err) {
      if (err instanceof AuthError) {
        router.replace('/login');
        return;
      }
      if (err instanceof RateLimitError) {
        setEditError('Rate limited. Please wait a moment and try again.');
        return;
      }
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function openDelete(p: Project) {
    setDeleting(p);
    setDeleteAck(false);
    setDeleteError(null);
    setActivePanel('delete');
  }
  async function handleConfirmDelete() {
    if (!deleting || !deleteAck) return;
    setDeletingNow(true);
    setDeleteError(null);
    try {
      const sdk = getSdk();
      await sdk.projects.delete(deleting.id);
      // ponytail: removing the project here does NOT cascade to its data
      // (deployments, env vars, etc.) — the API handles that server-side.
      setActivePanel(null);
      await load();
    } catch (err) {
      if (err instanceof AuthError) {
        router.replace('/login');
        return;
      }
      if (err instanceof RateLimitError) {
        setDeleteError('Rate limited. Please wait a moment and try again.');
        return;
      }
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingNow(false);
    }
  }

  // ── Search handler — debounced URL sync (ADR-036 principle 8) ──────────
  function handleSearchChange(value: string) {
    setSearch(value);
    // Debounce: update ?q= 300ms after the user stops typing.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      router.replace(`${location.pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  }

  // ── Filter (locale-aware: NFC Unicode normalization) ─────────────────
  const q = normalize(search);
  const filtered = q
    ? projects.filter(p =>
        normalize(p.name).includes(q) ||
        normalize(p.slug).includes(q) ||
        normalize(p.description ?? '').includes(q),
      )
    : projects;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header — title + search + hero action (ADR-036 principle 5) */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">
            {user?.name ? `Welcome back, ${user.name}` : 'Projects'}
          </h1>
          <p className="text-sm text-slate-500" aria-live="polite">
            {loading
              ? 'Loading…'
              : q
                ? `${filtered.length} of ${projects.length} project${projects.length !== 1 ? 's' : ''}`
                : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          {/* Search input — always visible, never behind a button */}
          <div className="relative flex-1 max-w-xs">
            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <Input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="pl-9 bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={load} title="Refresh" aria-label="Refresh" disabled={loading}>
            <HugeiconsIcon icon={Refresh01Icon} size={14} />
          </Button>
          {canEdit() && (
            <Button variant="primary" size="sm" onClick={openCreate} className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Add01Icon} size={14} />
              New project
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="bg-red-950/30 border border-red-800 rounded-lg p-3 mb-4 text-sm text-red-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            {rateLimitCountdown !== null && (
              <HugeiconsIcon icon={Time01Icon} size={14} className="text-amber-400 flex-shrink-0" />
            )}
            {loadError}
          </span>
          {!rateLimitCountdown && (
            <button onClick={load} className="text-xs text-red-300 hover:text-red-200 underline">Retry</button>
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <SkeletonGrid />
      ) : projects.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            icon={<HugeiconsIcon icon={Folder01Icon} size={48} className="text-slate-600" />}
            title={canEdit() ? 'No projects yet' : 'No projects'}
            description={canEdit()
              ? 'Create your first project to start deploying apps, databases, and more.'
              : 'No projects have been created yet. Contact your project owner to get access.'}
            action={canEdit() ? (
              <Button variant="primary" size="sm" onClick={openCreate} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Add01Icon} size={14} />
                Create your first project
              </Button>
            ) : undefined}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-slate-600" />}
            title="No matches"
            description={`No projects match "${search}".`}
            action={
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); router.replace('/projects', { scroll: false }); }}>
                Clear search
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite" aria-label="Projects list">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => router.push(`/projects/${project.slug}`)}
              onEdit={canEdit(project) ? () => openEdit(project) : undefined}
              onDelete={canDelete(project) ? () => openDelete(project) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Right panel: Create ── */}
      <RightPanel
        isOpen={activePanel === 'create'}
        onClose={() => setActivePanel(null)}
        title="New project"
        subtitle="Pick a name. You can configure everything else from the dashboard."
        footer={{
          onCancel: () => setActivePanel(null),
          onSubmit: handleCreate,
          submitLabel: 'Create project',
          loading: creating,
          submitDisabled: !name.trim(),
        }}
      >
        <ProjectForm
          name={name} onNameChange={setName}
          description={description} onDescriptionChange={setDescription}
          slug={slug}
          error={createError}
        />
      </RightPanel>

      {/* ── Right panel: Edit ── */}
      <RightPanel
        isOpen={activePanel === 'edit' && !!editing}
        onClose={() => setActivePanel(null)}
        title={editing ? `Edit "${editing.name}"` : 'Edit project'}
        subtitle="Changes save immediately to this project only."
        footer={{
          onCancel: () => setActivePanel(null),
          onSubmit: handleSaveEdit,
          submitLabel: 'Save changes',
          loading: savingEdit,
          submitDisabled: !editName.trim(),
        }}
      >
        <ProjectForm
          name={editName} onNameChange={setEditName}
          type={editType} onTypeChange={setEditType}
          description={editDescription} onDescriptionChange={setEditDescription}
          slug=""
          error={editError}
          descriptionPlaceholder={editing?.description ?? 'What does this project do?'}
          nameLabel="Project name"
          showType
          slugLabel={editing?.slug}
        />
      </RightPanel>

      {/* ── Right panel: Delete (destructive) ── */}
      <RightPanel
        isOpen={activePanel === 'delete' && !!deleting}
        onClose={() => setActivePanel(null)}
        title="Delete project?"
        footer={{
          onCancel: () => setActivePanel(null),
          onSubmit: handleConfirmDelete,
          submitLabel: 'Delete project',
          loading: deletingNow,
          submitDisabled: !deleteAck,
          submitDanger: true,
          hideCancel: false,
        }}
      >
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              You are about to permanently delete <strong className="text-slate-100">{deleting.name}</strong>.
              This will remove the project and the following data, which cannot be recovered:
            </p>
            <ul className="space-y-1.5 text-sm text-slate-400 ml-1">
              <li className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-400 flex-shrink-0" />
                Deployments and release history
              </li>
              <li className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-400 flex-shrink-0" />
                Environment variables and secrets
              </li>
              <li className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-400 flex-shrink-0" />
                Database instances and backups
              </li>
              <li className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-400 flex-shrink-0" />
                Storage buckets and uploaded files
              </li>
              <li className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-400 flex-shrink-0" />
                Email mailboxes, aliases, and messages
              </li>
              <li className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-red-400 flex-shrink-0" />
                Custom domains and DNS records
              </li>
            </ul>
            <label className="flex items-start gap-2 pt-3 border-t border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAck}
                onChange={e => setDeleteAck(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300">
                I understand this will permanently delete <strong className="text-slate-100">{deleting.name}</strong> and all of its data.
              </span>
            </label>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          </div>
        )}
      </RightPanel>
    </div>
  );
}

/* ── Project card (always-visible actions per user request) ── */
interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProjectCard({ project, onOpen, onEdit, onDelete }: ProjectCardProps) {
  // Per ADR-036 principle 1: card answers "what is it, is it healthy, can I open it"
  const lastActive = project.lastActivityAt ?? project.updatedAt;
  const statusKey = (project.status ?? '').toUpperCase();
  const statusColor = STATUS_PALETTE[statusKey] ?? 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="group relative rounded-lg border border-[#1e2130] bg-[#0f1117] hover:border-blue-500/50 transition-colors">
      {/* Main clickable area — slug-based URL per ADR-036 principle 6 */}
      <Link
        href={`/projects/${project.slug}`}
        className="block p-5 no-underline"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-blue-300 transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
              {project.slug}
            </p>
          </div>
        </div>

        {/* Health indicator: status pill + last-active line (ADR-036 principle 1) */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor}`}>
            {project.status?.toLowerCase() ?? 'unknown'}
          </span>
          {lastActive && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <HugeiconsIcon icon={Time01Icon} size={12} className="text-slate-600" />
              {relativeTime(lastActive)}
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 min-h-[2rem]">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#1e2130]">
          <span className="text-xs px-2 py-0.5 rounded bg-[#1e2130] text-slate-400 border border-[#2a2d3a] capitalize">
            {project.type}
          </span>
          <span className="text-xs text-slate-600">Open →</span>
        </div>
      </Link>

      {/* Always-visible action buttons (user explicitly requested these not be hover-only) */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-md text-slate-500 hover:text-blue-300 hover:bg-[#1e2130] transition-colors"
              aria-label={`Edit ${project.name}`}
              title="Edit"
            >
              <HugeiconsIcon icon={Edit01Icon} size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-[#1e2130] transition-colors"
              aria-label={`Delete ${project.name}`}
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

/* ── Skeleton cards (ADR-036 principle 15) ── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-lg border border-[#1e2130] bg-[#0f1117] p-5 animate-pulse">
          <div className="h-4 bg-[#1e2130] rounded w-2/3 mb-2" />
          <div className="h-3 bg-[#1e2130] rounded w-1/2 mb-4" />
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-16 bg-[#1e2130] rounded-full" />
            <div className="h-3 w-20 bg-[#1e2130] rounded" />
          </div>
          <div className="h-3 bg-[#1e2130] rounded w-full mb-2" />
          <div className="h-3 bg-[#1e2130] rounded w-4/5 mb-4" />
          <div className="flex items-center justify-between pt-2 border-t border-[#1e2130]">
            <div className="h-3 w-14 bg-[#1e2130] rounded" />
            <div className="h-3 w-10 bg-[#1e2130] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Shared form (used by both Create and Edit panels) ── */
interface ProjectFormProps {
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  slug: string;
  error: string | null;
  descriptionPlaceholder?: string;
  nameLabel?: string;
  /** Render the type picker — only shown in the Edit panel. */
  showType?: boolean;
  type?: ProjectType;
  onTypeChange?: (v: ProjectType) => void;
  /** Read-only real slug — shown in Edit panel. When absent the live slug preview is shown instead. */
  slugLabel?: string;
}

function ProjectForm({
  name, onNameChange,
  description, onDescriptionChange, slug, error,
  descriptionPlaceholder = 'What does this project do?',
  nameLabel = 'Project name',
  showType,
  type = 'frontend',
  onTypeChange,
  slugLabel,
}: ProjectFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Input
          label={nameLabel}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="my-app"
          autoFocus
          className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
        />
        {name && slugLabel ? (
          // Edit panel: show the real server-assigned slug, read-only.
          <p className="text-xs text-slate-500 mt-1.5">
            Slug: <span className="font-mono text-slate-300">{slugLabel}</span>
          </p>
        ) : name && slug ? (
          // Create panel: show a live preview (server appends a random suffix to this).
          <p className="text-xs text-slate-500 mt-1.5">
            Slug preview: <span className="font-mono text-slate-300">{slug}</span>
            <span className="text-slate-600"> (a suffix will be added)</span>
          </p>
        ) : null}
      </div>

      {showType && onTypeChange && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Type</label>
          <select
            value={type}
            onChange={e => onTypeChange(e.target.value as ProjectType)}
            className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          >
            {PROJECT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          rows={3}
          className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}