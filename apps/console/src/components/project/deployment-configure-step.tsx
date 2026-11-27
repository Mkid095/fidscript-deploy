'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/feedback';
import {
  checkSubdomainAvailableAction,
  type BuildPlan,
} from '@/app/(project)/projects/[projectId]/deployments/new/actions';

/** One environment-variable row, with the display state it carries. */
export interface EnvRow {
  id: number;
  key: string;
  value: string;
  /** A sensitive value renders hidden until Show is pressed. */
  sens: boolean;
  show: boolean;
}

const KEY_RE = /^[A-Z][A-Z0-9_]*$/;
const SUB_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;

export interface BuildOverrides {
  install: boolean;
  build: boolean;
  start: boolean;
  port: boolean;
}
export type OverrideKey = keyof BuildOverrides;

let nextRowId = 1;
export function newEnvRow(key = '', value = ''): EnvRow {
  return { id: nextRowId++, key, value, sens: true, show: false };
}

/** Parse pasted or imported `.env` text into rows. */
export function parseEnvText(text: string): Array<{ key: string; value: string }> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const eq = line.indexOf('=');
      return {
        key: line
          .slice(0, eq)
          .trim()
          .replace(/^export\s+/, '')
          .toUpperCase(),
        value: line.slice(eq + 1).trim().replace(/^["']|["']$/g, ''),
      };
    })
    .filter((pair) => KEY_RE.test(pair.key));
}

/** The platform domain the wizard's own addresses sit under. */
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'fidscript.com';

/**
 * What was detected, what to override, and what to send.
 *
 * The build plan is the platform's — the framework, the commands and the
 * port it found in the repository. Every one of them can be overridden,
 * and the environment rows take what the repository's own `.env.example`
 * asks for. A subdomain is checked as it is typed, so "taken" is said
 * before a deploy fails on it — never after.
 */
export function DeploymentConfigureStep({
  projectId,
  plan,
  envRows,
  onEnvRows,
  suggestions,
  onSuggestionsUsed,
  subdomain,
  onSubdomain,
  buildTarget,
  onBuildTarget,
  domains = [],
  domainId,
  onDomainId,
  overrides,
  onOverrides,
  overrideValues,
  onOverrideValues,
  onDeploy,
  registerDeploy,
  onBack,
  replaceWarning,
}: {
  projectId: string;
  plan: BuildPlan;
  envRows: EnvRow[];
  onEnvRows: (next: EnvRow[]) => void;
  /** The keys the repository's own .env.example asked for. */
  suggestions: string[];
  onSuggestionsUsed: () => void;
  subdomain: string;
  onSubdomain: (next: string) => void;
  /** The monorepo app this deployment builds, when the repository holds several. */
  buildTarget: string | null;
  onBuildTarget: (next: string | null) => void;
  /** The project's own domains — a name that is already the project's can answer here. */
  domains?: Array<{
    id: string;
    domain: string;
    dnsStatus: string;
    attached: boolean;
  }>;
  domainId: string | null;
  onDomainId: (next: string | null) => void;
  overrides: BuildOverrides;
  onOverrides: (next: BuildOverrides) => void;
  /** The typed values for the settings whose switches are on. */
  overrideValues: Record<OverrideKey, string>;
  onOverrideValues: (next: Record<OverrideKey, string>) => void;
  onDeploy: () => void;
  registerDeploy: (fn: () => void) => void;
  onBack: () => void;
  /** The project's live deployment, when this one takes its place. */
  replaceWarning?: React.ReactNode;
}) {
  const detected: Record<OverrideKey, string> = {
    install: plan.installCommand || 'npm install',
    build: plan.buildCommand,
    start: plan.startCommand,
    port: String(plan.port),
  };

  // ── The subdomain, checked while it is typed ────────────────────────────
  const [subState, setSubState] = useState<
    'idle' | 'checking' | 'ok' | 'taken' | 'invalid'
  >('idle');
  const [subReason, setSubReason] = useState<string | null>(null);
  useEffect(() => {
    const value = subdomain.trim().toLowerCase();
    if (!value) {
      setSubState('idle');
      setSubReason(null);
      return;
    }
    if (!SUB_RE.test(value)) {
      setSubState('invalid');
      setSubReason('Use lowercase letters, numbers and hyphens.');
      return;
    }
    setSubState('checking');
    setSubReason(null);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSubdomainAvailableAction(projectId, value);
      if (cancelled) return;
      if (result.available) {
        setSubState('ok');
      } else {
        setSubState('taken');
        setSubReason(result.reason ?? 'That name is not available.');
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [subdomain, projectId]);

  // ── The environment rows, and what is wrong with them ───────────────────
  const rowIssues = useMemo(() => {
    const seen = new Set<string>();
    return envRows.map((row) => {
      let issue = '';
      if (row.key || row.value) {
        if (!KEY_RE.test(row.key))
          issue = 'Use capital letters, numbers and underscores.';
        else if (seen.has(row.key)) issue = 'This name is already used.';
        else if (!row.value) issue = 'Add a value.';
      }
      if (row.key) seen.add(row.key);
      return issue;
    });
  }, [envRows]);

  const issueCount =
    rowIssues.filter(Boolean).length +
    (subState === 'taken' || subState === 'invalid' ? 1 : 0);
  const canDeploy =
    issueCount === 0 &&
    subState !== 'checking' &&
    (subState !== 'invalid' || !subdomain.trim());

  const setRow = (id: number, patch: Partial<EnvRow>) =>
    onEnvRows(envRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  /** Add rows for pasted or imported pairs, replacing one blank row. */
  const addPairs = (
    pairs: Array<{ key: string; value: string }>,
    blank?: EnvRow,
  ) => {
    const rows = blank && !blank.key && !blank.value
      ? envRows.filter((row) => row !== blank)
      : [...envRows];
    let added = 0;
    for (const pair of pairs) {
      const existing = rows.find((row) => row.key === pair.key);
      if (existing) existing.value = pair.value;
      else {
        rows.push(newEnvRow(pair.key, pair.value));
        added += 1;
      }
    }
    onEnvRows(rows);
    return added;
  };

  // ── Ctrl/Cmd+Enter deploys from here ────────────────────────────────────
  const deployRef = useRef<() => void>(() => {});
  deployRef.current = () => {
    if (canDeploy) onDeploy();
  };
  useEffect(() => registerDeploy(() => deployRef.current?.()), [registerDeploy]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        deployRef.current?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-5">
      {/* The repository this configures */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rail bg-surface-2 px-4 py-2.5">
        <p className="text-sm text-text">
          Branch <span className="font-medium">{plan.runtime}</span> ·{' '}
          {plan.frameworkLabel}
          {plan.frameworkVersion ? ` ${plan.frameworkVersion}` : ''}
        </p>
        <Badge tone={plan.monorepo ? 'accent' : 'neutral'}>
          {plan.monorepo ? 'monorepo' : 'detected'}
        </Badge>
      </div>

      {/* Where it will answer */}
      <div className="space-y-1.5">
        <label
          htmlFor="deploy-subdomain"
          className="text-xs font-medium text-text-muted"
        >
          Subdomain <span className="text-text-dim">(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              id="deploy-subdomain"
              className="w-full rounded-md border border-rail bg-surface px-3 py-2 pr-16 text-sm text-text outline-none focus:border-rail-light"
              placeholder="store"
              autoComplete="off"
              value={subdomain}
              aria-invalid={subState === 'taken' || subState === 'invalid'}
              onChange={(event) =>
                onSubdomain(event.target.value.toLowerCase())
              }
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {subState === 'checking' ? (
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-text-dim" />
              ) : subState === 'ok' ? (
                <span className="text-success" aria-hidden>✓</span>
              ) : subState === 'taken' || subState === 'invalid' ? (
                <span className="text-xs text-danger">✕</span>
              ) : null}
            </span>
          </div>
          <span className="font-mono text-xs text-text-dim">
            .apps.{PLATFORM_DOMAIN}
          </span>
        </div>
        <p className="text-xs text-text-dim">
          The deployment answers at{' '}
          <span className="font-mono text-text">
            https://{subdomain.trim().toLowerCase() || '<name>'}.apps.{PLATFORM_DOMAIN}
          </span>
          {subState === 'invalid' || subState === 'taken' ? (
            <span className="text-danger"> — {subReason}</span>
          ) : null}
        </p>
      </div>

      {/* A monorepo chooses its application */}
      {(plan.apps ?? []).length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-text-muted">
            This repository holds {(plan.apps ?? []).length} applications —
            which one is this deployment?
          </legend>
          {(plan.apps ?? []).map((app) => (
            <label
              key={app.path}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                (buildTarget ?? '') === app.path
                  ? 'border-accent bg-accent/5'
                  : 'border-rail bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="build-target"
                className="mt-0.5 size-3.5 accent-[var(--accent)]"
                checked={(buildTarget ?? '') === app.path}
                onChange={() => onBuildTarget(app.path)}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-text">
                  {app.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-text-dim">
                  {app.frameworkLabel} · {app.path}
                </span>
              </span>
            </label>
          ))}
          <p className="text-xs text-text-dim">
            The others stay available after this deployment — the finish screen
            offers them.
          </p>
        </fieldset>
      ) : null}

      {/* A name the project already owns */}
      {domains.filter((entry) => !entry.attached).length > 0 ? (
        <Select
          label="A name of the project's"
          hint="Optional. A domain that was added to this project — its records already written — answers for this deployment. The platform secures it with a certificate once the deployment is healthy."
          value={domainId ?? ''}
          onChange={(event) => onDomainId(event.target.value || null)}
          options={[
            {
              value: '',
              label: 'None — the deployment’s own address is enough',
            },
            ...domains
              .filter((entry) => !entry.attached)
              .map((entry) => ({ value: entry.id, label: entry.domain })),
          ]}
        />
      ) : null}

      {/* Build and output settings — the overrides */}
      <OverridesAccordion
        detected={detected}
        overrides={overrides}
        onOverrides={onOverrides}
        overrideValues={overrideValues}
        onOverrideValues={onOverrideValues}
      />

      {/* Environment variables */}
      <EnvSection
        rows={envRows}
        issues={rowIssues}
        suggestions={suggestions}
        onSuggestionsUsed={onSuggestionsUsed}
        setRow={setRow}
        addPairs={addPairs}
        onEnvRows={onEnvRows}
      />

      {replaceWarning}

      {/* The deploy bar */}
      <div className="space-y-2 border-t border-rail pt-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full shadow-lg shadow-accent/20"
          onClick={onDeploy}
          disabled={!canDeploy}
        >
          Deploy
          <kbd className="ml-2 rounded border border-white/30 px-1 text-[10px] font-normal">
            Ctrl ↵
          </kbd>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${issueCount > 0 ? 'text-warning' : 'text-text-dim'}`}>
            {issueCount > 0
              ? `Fix ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'} to continue.`
              : subState === 'checking'
                ? 'Checking the subdomain…'
                : ''}
          </span>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The four build settings, each overridable with a switch. */
function OverridesAccordion({
  detected,
  overrides,
  onOverrides,
  overrideValues,
  onOverrideValues,
}: {
  detected: Record<OverrideKey, string>;
  overrides: BuildOverrides;
  onOverrides: (next: BuildOverrides) => void;
  overrideValues: Record<OverrideKey, string>;
  onOverrideValues: (next: Record<OverrideKey, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const anyOverridden = Object.values(overrides).some(Boolean);
  const rows: Array<[OverrideKey, string]> = [
    ['install', 'Install command'],
    ['build', 'Build command'],
    ['start', 'Start command'],
    ['port', 'Port'],
  ];

  /** What the input shows: the typed override, or the detected default. */
  const shown = (key: OverrideKey) =>
    overrides[key] ? (overrideValues[key] ?? detected[key]) : detected[key];

  return (
    <div className="rounded-xl border border-rail bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text">
          <span
            className={`text-text-dim transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ›
          </span>
          Build and output settings
        </span>
        {anyOverridden ? (
          <Badge tone="accent">overridden</Badge>
        ) : (
          <span className="text-xs text-text-dim">as detected</span>
        )}
      </button>
      {open ? (
        <div className="space-y-3 border-t border-rail p-4">
          {rows.map(([key, label]) => (
            <div key={key} className="flex items-end gap-3">
              <div className="grow">
                <Input
                  label={label}
                  className={`font-mono text-xs ${overrides[key] ? '' : 'opacity-70'}`}
                  disabled={!overrides[key]}
                  value={shown(key)}
                  onChange={(event) =>
                    onOverrideValues({
                      ...overrideValues,
                      [key]: event.target.value,
                    })
                  }
                  {...(key === 'port'
                    ? { type: 'number' as const, min: 1024, max: 65535 }
                    : {})}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <span className="text-xs text-text-dim">Override</span>
                <Switch
                  on={overrides[key]}
                  label={`Override ${label}`}
                  onToggle={() => {
                    // Turning a switch on seeds the field with what was
                    // detected, so the override starts from the truth.
                    if (!overrides[key] && !overrideValues[key]) {
                      onOverrideValues({
                        ...overrideValues,
                        [key]: detected[key],
                      });
                    }
                    onOverrides({ ...overrides, [key]: !overrides[key] });
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-text-dim">
            A setting left alone is what the repository says. An override is
            used exactly as typed — every build of this project runs it.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** One switch, the console's own. */
function Switch({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-surface-2 border border-rail'
      }`}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-0.5'
        } ${on ? '' : 'bg-text-dim'}`}
      />
    </button>
  );
}

/** The environment rows: paste, import, suggest, validate. */
function EnvSection({
  rows,
  issues,
  suggestions,
  onSuggestionsUsed,
  setRow,
  addPairs,
  onEnvRows,
}: {
  rows: EnvRow[];
  issues: string[];
  suggestions: string[];
  onSuggestionsUsed: () => void;
  setRow: (id: number, patch: Partial<EnvRow>) => void;
  addPairs: (
    pairs: Array<{ key: string; value: string }>,
    blank?: EnvRow,
  ) => number;
  onEnvRows: (next: EnvRow[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const count = rows.filter((row) => row.key).length;

  return (
    <div className="rounded-xl border border-rail bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text">
          <span
            className={`text-text-dim transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ›
          </span>
          Environment variables
        </span>
        <span className="text-xs text-text-dim">{count}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-rail p-4">
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2">
              <p className="text-xs text-text">
                Found <span className="font-medium">.env.example</span> with{' '}
                {suggestions.length} variable
                {suggestions.length === 1 ? '' : 's'}.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  addPairs(suggestions.map((key) => ({ key, value: '' })));
                  onSuggestionsUsed();
                }}
              >
                Add them
              </Button>
            </div>
          ) : null}

          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <div>
                <input
                  className="w-full rounded-md border border-rail bg-surface px-3 py-2 font-mono text-xs text-text outline-none focus:border-rail-light"
                  placeholder="EXAMPLE_NAME"
                  aria-label="Key"
                  aria-invalid={!!issues[index]}
                  autoComplete="off"
                  value={row.key}
                  onChange={(event) =>
                    setRow(row.id, { key: event.target.value.toUpperCase() })
                  }
                  onPaste={(event) => {
                    const text = event.clipboardData.getData('text');
                    if (text.includes('\n') || text.includes('=')) {
                      const pairs = parseEnvText(text);
                      if (pairs.length) {
                        event.preventDefault();
                        const blank = rows.find(
                          (candidate) =>
                            !candidate.key && !candidate.value && candidate.id !== row.id,
                        );
                        addPairs(pairs, blank ?? row);
                      }
                    }
                  }}
                />
                <span className="mt-0.5 block min-h-4 text-[11px] text-danger">
                  {issues[index]}
                </span>
              </div>
              <div className="flex items-start gap-1">
                <input
                  className="w-full rounded-md border border-rail bg-surface px-3 py-2 font-mono text-xs text-text outline-none focus:border-rail-light"
                  placeholder="value"
                  aria-label="Value"
                  type={row.show || !row.sens ? 'text' : 'password'}
                  autoComplete="off"
                  value={row.value}
                  onChange={(event) => setRow(row.id, { value: event.target.value })}
                />
                <button
                  type="button"
                  className="mt-1 shrink-0 rounded px-1.5 py-1 text-[11px] text-text-dim hover:text-text"
                  aria-label={row.show ? 'Hide value' : 'Show value'}
                  onClick={() => setRow(row.id, { show: !row.show })}
                >
                  {row.show ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  on={row.sens}
                  label="Sensitive"
                  onToggle={() => setRow(row.id, { sens: !row.sens })}
                />
                <button
                  type="button"
                  className="rounded px-2 py-1 text-text-dim hover:text-danger"
                  aria-label="Remove variable"
                  onClick={() =>
                    onEnvRows(
                      rows.length > 1
                        ? rows.filter((entry) => entry.id !== row.id)
                        : [newEnvRow()],
                    )
                  }
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEnvRows([...rows, newEnvRow()])}
            >
              + Add more
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-rail bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-2">
              <FileUp className="size-3.5 text-text-dim" aria-hidden />
              Import .env
              <input
                type="file"
                accept=".env,.env.*,env,.txt"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const added = addPairs(parseEnvText(await file.text()));
                  event.target.value = '';
                  if (added === 0) return;
                }}
              />
            </label>
            <span className="text-xs text-text-dim">
              or paste the .env contents into a Key field
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
