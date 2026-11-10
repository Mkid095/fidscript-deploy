'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { BuildLogViewer } from '@/components/project/build-log-viewer';
import {
  destroyDeploymentAction,
  redeployAction,
  restartDeploymentAction,
  rollbackDeploymentAction,
  stopDeploymentAction,
} from '@/app/(project)/projects/[projectId]/deployments/actions';

/** A deployment as the platform keeps it — the shape the API returns. */
export interface DeploymentItem {
  id: string;
  status: string;
  deploymentUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  releaseId: string | null;
  release?: {
    version: string | null;
    branch: string | null;
    commitSha: string | null;
    commitMessage: string | null;
    sourceUrl: string | null;
  } | null;
}

type NormalStatus = 'ready' | 'building' | 'queued' | 'failed' | 'stopped';
type Tab = 'overview' | 'logs';
const IN_FLIGHT = ['QUEUED', 'PENDING', 'BLOCKED', 'BUILDING', 'DEPLOYING'];

/** What the platform's status reads, in the list's words. */
function normalize(status: string): NormalStatus {
  const s = status.toUpperCase();
  if (s === 'SUCCESS') return 'ready';
  if (s === 'FAILED') return 'failed';
  if (s === 'STOPPED') return 'stopped';
  if (s === 'BUILDING' || s === 'DEPLOYING') return 'building';
  return 'queued';
}
const STATUS_LABEL: Record<NormalStatus, string> = {
  ready: 'Ready',
  building: 'Building',
  queued: 'Queued',
  failed: 'Failed',
  stopped: 'Stopped',
};

/* The words around a time. */
const ago = (ts: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  return s < 60
    ? `${s}s ago`
    : s < 3600
      ? `${Math.floor(s / 60)}m ago`
      : s < 86400
        ? `${Math.floor(s / 3600)}h ago`
        : `${Math.floor(s / 86400)}d ago`;
};
const dur = (s: number) =>
  s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const durationOf = (d: DeploymentItem) =>
  d.completedAt
    ? Math.max(
        0,
        Math.round(
          (new Date(d.completedAt).getTime() - new Date(d.createdAt).getTime()) / 1000,
        ),
      )
    : null;
const dayLabel = (ts: string) => {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  return d.toDateString() === today.toDateString()
    ? 'Today'
    : d.toDateString() === yest.toDateString()
      ? 'Yesterday'
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const hashOf = (d: DeploymentItem) =>
  d.release?.commitSha?.slice(0, 7) ?? d.releaseId?.slice(0, 7) ?? '—';
const branchOf = (d: DeploymentItem) => d.release?.branch ?? 'main';
const sourceOf = (d: DeploymentItem) => {
  const src = d.release?.sourceUrl ?? '';
  return src ? src.replace(/^https?:\/\//, '').replace(/\.git$/, '') : null;
};
const titleOf = (d: DeploymentItem) =>
  d.release?.commitMessage ??
  d.release?.version ??
  `Deploy · ${new Date(d.createdAt).toLocaleDateString()}`;
const subtitleOf = (d: DeploymentItem) => {
  const src = sourceOf(d);
  return [src ? `from ${src}` : null, `branch ${branchOf(d)}`]
    .filter(Boolean)
    .join(' · ');
};

/** The things a row can do — all real, all the platform's. */
type Actions = {
  visit: (d: DeploymentItem) => void;
  copyUrl: (d: DeploymentItem) => void;
  redeploy: (d: DeploymentItem) => void;
  stop: (d: DeploymentItem) => void;
  restart: (d: DeploymentItem) => void;
  rollback: (d: DeploymentItem) => void;
  del: (d: DeploymentItem) => void;
  open: (d: DeploymentItem, tab?: Tab) => void;
};

export function DeploymentHistory({
  projectId,
  projectSlug,
  deployments,
  activeId,
}: {
  projectId: string;
  projectSlug: string;
  deployments: DeploymentItem[];
  activeId: string | null;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [deps, setDeps] = useState<DeploymentItem[]>(deployments);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [limit, setLimit] = useState(8);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ id: string; tab: Tab } | null>(null);
  const [removing, setRemoving] = useState<DeploymentItem | null>(null);
  const [pending, startConfirm] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const newHref = `/projects/${projectSlug}/deployments/new`;

  // A page refresh after an action brings the server's truth back.
  useEffect(() => setDeps(deployments), [deployments]);

  // While a build is on the move, the list is read again — for real.
  const anyInFlight = deps.some((d) => IN_FLIGHT.includes(d.status.toUpperCase()));
  useEffect(() => {
    if (!anyInFlight) return;
    const timer = setInterval(async () => {
      try {
        const result = await browserApi.get<{ deployments?: DeploymentItem[] }>(
          `/projects/${projectId}/deployments`,
        );
        if (result.deployments) setDeps(result.deployments);
      } catch {
        /* one missed read is not the end of the world */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [anyInFlight, projectId]);

  // "/" focuses the search.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const typing = /INPUT|SELECT|TEXTAREA/.test(
        (document.activeElement as HTMLElement | null)?.tagName ?? '',
      );
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>, message?: string) => {
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        toast.error('That did not work', result.error);
        return;
      }
      if (message) toast.success(message);
      window.location.reload();
    });
  };

  const actions: Actions = {
    visit: (d) =>
      d.deploymentUrl ? window.open(d.deploymentUrl, '_blank', 'noreferrer') : null,
    copyUrl: (d) => {
      if (!d.deploymentUrl) return;
      void navigator.clipboard?.writeText(d.deploymentUrl);
      toast.success('Address copied.');
    },
    redeploy: (d) => {
      const gitUrl = d.release?.sourceUrl;
      if (!gitUrl) return;
      run(
        () => redeployAction(projectId, { gitUrl, branch: branchOf(d) }),
        'It is building again.',
      );
    },
    stop: (d) => run(() => stopDeploymentAction(projectId, d.id), 'The deployment was stopped.'),
    restart: (d) => run(() => restartDeploymentAction(projectId, d.id), 'It is starting again.'),
    rollback: (d) => run(() => rollbackDeploymentAction(projectId, d.id), 'Rolled back.'),
    del: (d) => setRemoving(d),
    open: (d, tab = 'overview') => setDrawer({ id: d.id, tab }),
  };

  const confirmedDelete = () => {
    const target = removing;
    setRemoving(null);
    if (!target) return;
    startConfirm(async () => {
      const result = await destroyDeploymentAction(projectId, target.id);
      if (result.error) toast.error('That did not work', result.error);
      else {
        toast.success('The deployment was removed.');
        window.location.reload();
      }
    });
  };

  const open = drawer ? deps.find((d) => d.id === drawer.id) : undefined;

  return (
    <div className="space-y-5">
      <ProductionCard
        deps={deps}
        activeId={activeId}
        newHref={newHref}
        onViewFailed={(d) => actions.open(d, 'logs')}
      />

      <Toolbar
        deps={deps}
        q={q}
        setQ={setQ}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        sort={sort}
        setSort={setSort}
        searchRef={searchRef}
      />

      <ListBody
        deps={deps}
        q={q}
        statusFilter={statusFilter}
        branchFilter={branchFilter}
        sort={sort}
        limit={limit}
        onMore={() => setLimit((n) => n + 6)}
        activeId={activeId}
        menuId={menuId}
        setMenuId={setMenuId}
        actions={actions}
        newHref={newHref}
      />

      {open && drawer ? (
        <Drawer
          d={open}
          projectId={projectId}
          tab={drawer.tab}
          setTab={(tab) => setDrawer({ id: open.id, tab })}
          onClose={() => setDrawer(null)}
          actions={actions}
        />
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={confirmedDelete}
        title="Remove this deployment?"
        body="The container, the image and the record are gone. This cannot be undone."
        confirmLabel="Remove it for good"
        pending={pending}
      />
    </div>
  );
}

/* What is live, and how healthy the recent builds have been. */
function ProductionCard({
  deps,
  activeId,
  newHref,
  onViewFailed,
}: {
  deps: DeploymentItem[];
  activeId: string | null;
  newHref: string;
  onViewFailed: (d: DeploymentItem) => void;
}) {
  if (deps.length === 0) return null;
  const current = deps.find(
    (d) => d.id === activeId && normalize(d.status) === 'ready',
  );
  const recent = [...deps]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-12);
  const finished = recent.filter((d) =>
    ['ready', 'failed'].includes(normalize(d.status)),
  );
  const rate = finished.length
    ? Math.round(
        (finished.filter((d) => normalize(d.status) === 'ready').length /
          finished.length) *
          100,
      )
    : null;

  if (!current) {
    const failed = deps
      .filter((d) => normalize(d.status) === 'failed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rail bg-surface p-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Production · nothing live
          </p>
          <p className="mt-1 text-sm font-semibold text-text">
            No deployment is up right now
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {failed
              ? 'The latest build failed — open it to see what went wrong, then deploy again.'
              : 'Deploy a repository to get a live address.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {failed ? (
            <Button variant="ghost" size="sm" onClick={() => onViewFailed(failed)}>
              View the failed build
            </Button>
          ) : null}
          <Link href={newHref}>
            <Button variant="primary" size="sm">New deployment</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-success/30 bg-surface p-5">
      <div style={{ minWidth: 0 }}>
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Production <Badge tone="success">live</Badge>
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-text">{titleOf(current)}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs text-text-dim">
          <span className="rounded border border-rail bg-surface-2 px-1.5 py-0.5">
            {hashOf(current)}
          </span>
          <span>{branchOf(current)}</span>
          <span>{ago(current.createdAt)}</span>
        </div>
        {current.deploymentUrl ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.open(current.deploymentUrl!, '_blank', 'noreferrer')}
              className="truncate font-mono text-xs text-accent-soft hover:underline"
            >
              {current.deploymentUrl.replace(/^https?:\/\//, '')}
            </button>
            <button
              onClick={() => void navigator.clipboard?.writeText(current.deploymentUrl!)}
              className="rounded p-1 text-text-dim transition-colors hover:text-text"
              aria-label="Copy the address"
            >
              <Copy className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {recent.length > 0 ? (
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">
            Last {recent.length} builds
          </p>
          {rate !== null ? (
            <p className="mt-0.5 text-2xl font-semibold text-text">
              {rate}
              <span className="text-sm font-medium text-text-muted"> % succeeded</span>
            </p>
          ) : null}
          <div className="mt-2 flex gap-1">
            {recent.map((d) => {
              const st = normalize(d.status);
              return (
                <span
                  key={d.id}
                  title={`${STATUS_LABEL[st]} · ${titleOf(d)}`}
                  className={`h-5 w-2 rounded-full ${
                    st === 'ready'
                      ? 'bg-success'
                      : st === 'failed'
                        ? 'bg-danger'
                        : st === 'building'
                          ? 'bg-warning'
                          : 'bg-rail-light'
                  }`}
                />
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-text-dim">oldest · latest</p>
        </div>
      ) : null}
    </div>
  );
}

/* Search, filters, sort. */
function Toolbar({
  deps,
  q,
  setQ,
  statusFilter,
  setStatusFilter,
  branchFilter,
  setBranchFilter,
  sort,
  setSort,
  searchRef,
}: {
  deps: DeploymentItem[];
  q: string;
  setQ: (v: string) => void;
  statusFilter: Set<string>;
  setStatusFilter: (fn: (s: Set<string>) => Set<string>) => void;
  branchFilter: Set<string>;
  setBranchFilter: (fn: (s: Set<string>) => Set<string>) => void;
  sort: 'new' | 'old';
  setSort: (s: 'new' | 'old') => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const branches = useMemo(
    () => [...new Set(deps.map(branchOf))],
    [deps],
  );
  const anyFilter = q.trim() || statusFilter.size > 0 || branchFilter.size > 0;

  const toggle =
    (set: Set<string>, apply: (fn: (s: Set<string>) => Set<string>) => void) =>
    (value: string) => {
      const next = new Set(set);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      apply(() => next);
    };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-dim" aria-hidden />
        <input
          ref={searchRef}
          className="w-full rounded-lg border border-rail bg-surface-2 py-2 pl-10 pr-9 font-mono text-xs text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent"
          placeholder="Search by message, commit or branch"
          aria-label="Search deployments"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-rail bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
          /
        </kbd>
      </div>

      <FilterPill
        label="Status"
        options={Object.keys(STATUS_LABEL).map((v) => ({
          v,
          l: STATUS_LABEL[v as NormalStatus],
          n: deps.filter((d) => normalize(d.status) === v).length,
        }))}
        selected={statusFilter}
        onToggle={toggle(statusFilter, setStatusFilter)}
      />
      {branches.length > 0 ? (
        <FilterPill
          label="Branch"
          options={branches.map((b) => ({
            v: b,
            l: b,
            n: deps.filter((d) => branchOf(d) === b).length,
          }))}
          selected={branchFilter}
          onToggle={toggle(branchFilter, setBranchFilter)}
        />
      ) : null}

      {anyFilter ? (
        <button
          className="text-xs text-text-dim hover:text-text"
          onClick={() => {
            setQ('');
            setStatusFilter(() => new Set());
            setBranchFilter(() => new Set());
          }}
        >
          Clear
        </button>
      ) : null}

      <select
        aria-label="Sort"
        className="rounded-lg border border-rail bg-surface-2 px-2.5 py-2 text-xs text-text-muted outline-none focus:border-accent"
        value={sort}
        onChange={(e) => setSort(e.target.value as 'new' | 'old')}
      >
        <option value="new">Newest first</option>
        <option value="old">Oldest first</option>
      </select>
    </div>
  );
}

function FilterPill({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ v: string; l: string; n: number }>;
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const text =
    selected.size === 1
      ? [...selected][0]
      : selected.size > 1
        ? `${selected.size} selected`
        : '';
  return (
    <div className="relative">
      <button
        onClick={() => setShow((s) => !s)}
        aria-haspopup="true"
        aria-expanded={show}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
          selected.size
            ? 'border-accent/40 bg-accent/5 text-text'
            : 'border-rail bg-surface-2 text-text-muted hover:text-text'
        }`}
      >
        {label}
        {text ? <span className="font-medium text-accent-soft">{text}</span> : null}
        <ChevronDown
          className={`size-3.5 text-text-dim transition-transform ${show ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {show ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-rail bg-surface p-1 shadow-lg">
          {options.map((o) => (
            <label
              key={o.v}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-surface-2"
            >
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={selected.has(o.v)}
                onChange={() => onToggle(o.v)}
              />
              <span className="flex-1">{o.l}</span>
              <span className="font-mono text-[10px] text-text-dim">{o.n}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* The day-grouped table. */
function ListBody({
  deps,
  q,
  statusFilter,
  branchFilter,
  sort,
  limit,
  onMore,
  activeId,
  menuId,
  setMenuId,
  actions,
  newHref,
}: {
  deps: DeploymentItem[];
  q: string;
  statusFilter: Set<string>;
  branchFilter: Set<string>;
  sort: 'new' | 'old';
  limit: number;
  onMore: () => void;
  activeId: string | null;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  actions: Actions;
  newHref: string;
}) {
  const needle = q.trim().toLowerCase();
  const filtered = deps
    .filter(
      (d) =>
        (!needle ||
          `${titleOf(d)} ${hashOf(d)} ${branchOf(d)}`.toLowerCase().includes(needle)) &&
        (!statusFilter.size || statusFilter.has(normalize(d.status))) &&
        (!branchFilter.size || branchFilter.has(branchOf(d))),
    )
    .sort((a, b) =>
      sort === 'new'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const shown = filtered.slice(0, limit);

  if (deps.length === 0) {
    return (
      <div className="rounded-xl border border-rail bg-surface py-12 text-center">
        <p className="text-sm font-medium text-text">No deployments yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">
          Deploy a repository and every build, success or failure, is listed here
          with its logs.
        </p>
        <div className="mt-4">
          <Link href={newHref}>
            <Button variant="primary" size="sm">New deployment</Button>
          </Link>
        </div>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-rail bg-surface py-10 text-center">
        <p className="text-sm font-medium text-text">No deployments match</p>
        <p className="mt-1 text-xs text-text-muted">
          Try a different search, or clear the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-rail bg-surface">
      <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-rail bg-surface-2 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-dim sm:grid-cols-[minmax(0,1.6fr)_140px_150px_90px_44px]">
        <span>Deployment</span>
        <span className="hidden sm:block">Status</span>
        <span className="hidden sm:block">Source</span>
        <span className="hidden sm:block">Age</span>
        <span />
      </div>
      <div className="divide-y divide-rail">
        {shown.map((d, i) => {
          const showDay =
            i === 0 || dayLabel(shown[i - 1].createdAt) !== dayLabel(d.createdAt);
          return (
            <div key={d.id}>
              {showDay ? (
                <div className="flex items-center gap-2 bg-surface-2/60 px-4 py-1.5 font-mono text-[11px] text-text-dim">
                  {dayLabel(d.createdAt)}
                  <span>
                    · {shown.filter((x) => dayLabel(x.createdAt) === dayLabel(d.createdAt)).length}
                  </span>
                </div>
              ) : null}
              <Row
                d={d}
                isCurrent={d.id === activeId}
                menuOpen={menuId === d.id}
                onMenu={() => setMenuId(menuId === d.id ? null : d.id)}
                onCloseMenu={() => setMenuId(null)}
                actions={actions}
              />
            </div>
          );
        })}
      </div>
      {filtered.length > limit ? (
        <div className="border-t border-rail p-3 text-center">
          <Button variant="ghost" size="sm" onClick={onMore}>
            Load {Math.min(6, filtered.length - limit)} more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatusCell({ d }: { d: DeploymentItem }) {
  const st = normalize(d.status);
  const elapsed = durationOf(d);
  if (st === 'building' || st === 'queued')
    return (
      <span className="flex items-center gap-1.5 text-xs">
        {st === 'building' ? (
          <span
            className="inline-block size-3 animate-spin rounded-full border-2 border-accent border-t-transparent"
            aria-hidden
          />
        ) : (
          <span className="size-2 rounded-full bg-rail-light" aria-hidden />
        )}
        <span className="text-text-muted">{STATUS_LABEL[st]}</span>
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={`size-2 rounded-full ${
          st === 'ready' ? 'bg-success' : st === 'failed' ? 'bg-danger' : 'bg-rail-light'
        }`}
        aria-hidden
      />
      <span className="text-text-muted">{STATUS_LABEL[st]}</span>
      {elapsed != null ? (
        <span className="font-mono text-[11px] text-text-dim">{dur(elapsed)}</span>
      ) : null}
    </span>
  );
}

function Row({
  d,
  isCurrent,
  menuOpen,
  onMenu,
  onCloseMenu,
  actions,
}: {
  d: DeploymentItem;
  isCurrent: boolean;
  menuOpen: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
  actions: Actions;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => actions.open(d)}
      onKeyDown={(e) => e.key === 'Enter' && actions.open(d)}
      className={`relative grid cursor-pointer grid-cols-[1fr_auto] gap-2 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:grid-cols-[minmax(0,1.6fr)_140px_150px_90px_44px] ${
        isCurrent ? 'bg-surface-2/40' : ''
      }`}
    >
      {isCurrent ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
      ) : null}

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-text">{titleOf(d)}</p>
          {isCurrent ? <Badge tone="accent">current</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-text-dim">{subtitleOf(d)}</p>
      </div>

      <div className="hidden sm:block">
        <StatusCell d={d} />
      </div>

      <div className="hidden sm:block">
        <span className="rounded border border-rail bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text-muted">
          {hashOf(d)}
        </span>
        <p className="mt-0.5 font-mono text-[11px] text-text-dim">{branchOf(d)}</p>
      </div>

      <div className="hidden sm:block">
        <span
          title={new Date(d.createdAt).toLocaleString()}
          className="text-xs text-text-muted"
        >
          {ago(d.createdAt)}
        </span>
      </div>

      <div
        className="relative flex items-center justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="rounded p-1 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Actions"
          aria-expanded={menuOpen}
          onClick={onMenu}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
        {menuOpen ? (
          <RowMenu d={d} actions={actions} onDone={onCloseMenu} />
        ) : null}
      </div>
    </div>
  );
}

function RowMenu({
  d,
  actions,
  onDone,
}: {
  d: DeploymentItem;
  actions: Actions;
  onDone: () => void;
}) {
  const st = normalize(d.status);
  const running = st === 'building' || st === 'queued';
  const stopped = st === 'failed' || st === 'stopped';
  const pick = (fn: () => void) => () => {
    fn();
    onDone();
  };
  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-rail bg-surface p-1 shadow-lg">
      {d.deploymentUrl ? (
        <MenuItem icon={<ExternalLink className="size-3.5" />} label="Open it" onClick={pick(() => actions.visit(d))} />
      ) : null}
      <MenuItem icon={<Search className="size-3.5" />} label="View logs" onClick={pick(() => actions.open(d, 'logs'))} />
      {d.deploymentUrl ? (
        <MenuItem icon={<Copy className="size-3.5" />} label="Copy address" onClick={pick(() => actions.copyUrl(d))} />
      ) : null}
      <MenuItem label="Roll back" onClick={pick(() => actions.rollback(d))} />
      {d.release?.sourceUrl ? (
        <MenuItem label="Deploy it again" onClick={pick(() => actions.redeploy(d))} />
      ) : null}
      {running ? <MenuItem label="Stop it" onClick={pick(() => actions.stop(d))} /> : null}
      {stopped ? <MenuItem label="Start it again" onClick={pick(() => actions.restart(d))} /> : null}
      <div className="my-1 border-t border-rail" />
      <MenuItem icon={<Trash2 className="size-3.5" />} label="Remove" danger onClick={pick(() => actions.del(d))} />
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        danger ? 'text-danger hover:bg-danger/10' : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      {icon ? <span className="text-text-dim">{icon}</span> : null}
      {label}
    </button>
  );
}

/* The detail drawer: overview and the build log. */
function Drawer({
  d,
  projectId,
  tab,
  setTab,
  onClose,
  actions,
}: {
  d: DeploymentItem;
  projectId: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  onClose: () => void;
  actions: Actions;
}) {
  const st = normalize(d.status);
  const running = st === 'building' || st === 'queued';
  const [logs, setLogs] = useState('');
  const [drawerPending, startDrawer] = useTransition();

  const readLogs = useCallback(async () => {
    const result = await browserApi
      .get<{ logs?: string }>(`/projects/${projectId}/deployments/${d.id}/logs`)
      .catch(() => null);
    if (result?.logs)
      setLogs((cur) => (result.logs!.length > cur.length ? result.logs! : cur));
  }, [projectId, d.id]);

  useEffect(() => {
    void readLogs();
    if (!running) return;
    const timer = setInterval(readLogs, 2000);
    return () => clearInterval(timer);
  }, [readLogs, running]);

  const total = durationOf(d) ?? 0;
  const runAction = (fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    startDrawer(async () => {
      const result = await fn();
      if (!result.error) onClose();
      window.location.reload();
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Deployment details"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-rail bg-surface shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rail p-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text">{titleOf(d)}</h3>
            <p className="mt-0.5 truncate text-xs text-text-dim">
              {subtitleOf(d)} · {ago(d.createdAt)}
            </p>
            <div className="mt-2">
              <StatusCell d={d} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex border-b border-rail" role="tablist">
          {(['overview', 'logs'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-accent text-text'
                  : 'border-b-2 border-transparent text-text-dim hover:text-text'
              }`}
            >
              {t === 'overview' ? 'Overview' : 'Logs'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'overview' ? (
            <div className="space-y-5">
              {d.deploymentUrl ? (
                <section>
                  <SectionLabel>Address</SectionLabel>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-rail bg-surface-2 px-3 py-2">
                    <span className="truncate font-mono text-xs text-text">
                      {d.deploymentUrl.replace(/^https?:\/\//, '')}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => actions.copyUrl(d)}
                        className="rounded p-1 text-text-dim hover:text-text"
                        aria-label="Copy address"
                      >
                        <Copy className="size-3.5" aria-hidden />
                      </button>
                      <button
                        onClick={() => actions.visit(d)}
                        className="rounded p-1 text-text-dim hover:text-text"
                        aria-label="Open it"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section>
                <SectionLabel>Details</SectionLabel>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <Fact k="Branch" v={branchOf(d)} />
                  <Fact k="Commit" v={hashOf(d)} mono />
                  <Fact k="Status" v={STATUS_LABEL[st]} />
                  <Fact
                    k="Duration"
                    v={total > 0 ? dur(total) : running ? 'in progress' : '—'}
                  />
                  <Fact k="Created" v={new Date(d.createdAt).toLocaleString()} wide />
                  {sourceOf(d) ? <Fact k="Source" v={sourceOf(d)!} wide /> : null}
                </dl>
              </section>

              <section>
                <SectionLabel>Timeline</SectionLabel>
                <Timeline d={d} />
              </section>
            </div>
          ) : (
            <div className="space-y-2">
              <SectionLabel>Build log</SectionLabel>
              <BuildLogViewer logs={logs} status={d.status} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-rail p-4">
          {running ? (
            <Button variant="secondary" size="sm" loading={drawerPending} onClick={() => runAction(() => stopDeploymentAction(projectId, d.id))}>
              Stop it
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={drawerPending}
              disabled={!d.release?.sourceUrl}
              onClick={() =>
                runAction(() =>
                  redeployAction(projectId, {
                    gitUrl: d.release?.sourceUrl ?? '',
                    branch: branchOf(d),
                  }),
                )
              }
            >
              Deploy it again
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-dim">
      {children}
    </p>
  );
}
function Fact({
  k,
  v,
  mono,
  wide,
}: {
  k: string;
  v: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-[11px] text-text-dim">{k}</dt>
      <dd className={`mt-0.5 text-text ${mono ? 'font-mono' : ''}`}>{v}</dd>
    </div>
  );
}

function Timeline({ d }: { d: DeploymentItem }) {
  const st = normalize(d.status);
  const steps: Array<{ label: string; state: 'ok' | 'bad' | 'run' | 'todo' }> = [
    { label: 'Queued', state: st === 'queued' ? 'run' : 'ok' },
    {
      label: 'Building',
      state:
        st === 'queued' ? 'todo' : st === 'building' ? 'run' : st === 'ready' ? 'ok' : 'bad',
    },
    { label: 'Deploying', state: st === 'ready' ? 'ok' : 'todo' },
    { label: 'Ready', state: st === 'ready' ? 'ok' : 'todo' },
  ];
  return (
    <ul className="space-y-2">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-xs">
          {s.state === 'ok' ? (
            <Check className="size-3.5 text-success" aria-hidden />
          ) : s.state === 'bad' ? (
            <X className="size-3.5 text-danger" aria-hidden />
          ) : s.state === 'run' ? (
            <span
              className="inline-block size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent"
              aria-hidden
            />
          ) : (
            <span className="size-3.5 rounded-full border border-rail" aria-hidden />
          )}
          <span
            className={
              s.state === 'todo'
                ? 'text-text-dim'
                : s.state === 'bad'
                  ? 'text-danger'
                  : 'text-text'
            }
          >
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
