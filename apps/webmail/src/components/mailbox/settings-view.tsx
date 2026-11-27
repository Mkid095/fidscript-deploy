'use client';

import { useEffect, useRef, useState } from 'react';

import {
  getMailClients,
  getSettings,
  listFilterRules,
  listMailboxes,
  saveFilterRules,
  FilterRuleAction,
  FilterRuleMatchKey,
  MailClientConfig,
  SettingsShape,
} from '@/lib/mailbox/api';
import type { Mailbox } from '@/lib/mailbox/types';
import {
  Plane,
  Filter,
  MonitorSmartphone,
  Check,
  Save,
  Plus,
  Trash2,
  Copy,
  Sun,
  Moon,
  KeyRound,
  ChevronDown,
} from 'lucide-react';

interface SettingsViewProps {
  email: string;
}

type Tab = 'auto-reply' | 'filters' | 'clients';

const tabs: Array<{ value: Tab; label: string; icon: typeof Plane }> = [
  { value: 'auto-reply', label: 'Auto-reply', icon: Plane },
  { value: 'filters', label: 'Filters & Forwarding', icon: Filter },
  { value: 'clients', label: 'Mail Clients', icon: MonitorSmartphone },
];

/** A rule as it lives in the form, before it is written down. */
interface RuleDraft {
  key: string;
  matchKey: FilterRuleMatchKey;
  matchValue: string;
  action: FilterRuleAction;
  target: string;
}

const ruleMatchLabels: Record<FilterRuleMatchKey, string> = {
  from: 'If the sender contains',
  subject: 'If the subject contains',
};

const ruleActionLabels: Record<FilterRuleAction, string> = {
  move: 'Move to folder',
  forward: 'Forward to address',
  junk: 'Mark as spam',
};

/**
 * The account's settings, in-app and in the design's language.
 *
 * Auto-reply and the sieve the filters compile to are Stalwart's, written
 * through the settings and filter-rules endpoints. The mail-client card is
 * plain configuration this server publishes. The theme switch lives in the
 * top bar, not here; the signature lives with the templates.
 */
export function SettingsView({ email }: SettingsViewProps) {
  const [tab, setTab] = useState<Tab>('auto-reply');
  const [data, setData] = useState<SettingsShape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((shape) => {
        if (!cancelled) setData(shape);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Settings could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(payload: Record<string, unknown>) {
    setNotice('');
    setError(null);
    setBusy(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? 'That did not save.');
      });
      setNotice('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.');
    } finally {
      setBusy(false);
    }
  }

  // ── Auto-reply ──────────────────────────────────────────────────────
  const vacation = data?.vacation ?? null;

  // ── Filters & forwarding ────────────────────────────────────────────
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [filtersActive, setFiltersActive] = useState(false);
  const [folders, setFolders] = useState<Mailbox[]>([]);
  const [generated, setGenerated] = useState<string>('');
  const [showSieve, setShowSieve] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterNotice, setFilterNotice] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const ruleCounter = useRef(0);

  useEffect(() => {
    if (!data) return; // wait for the settings load; it carries the active flag
    let cancelled = false;
    (async () => {
      const [ruleList, mailboxList] = await Promise.all([
        listFilterRules().catch(() => ({ rules: [] })),
        listMailboxes().catch(() => ({ mailboxes: [] })),
      ]);
      if (cancelled) return;
      setRules(
        ruleList.rules.map((r) => ({
          key: r.id ?? `draft-${ruleCounter.current++}`,
          matchKey: r.matchKey,
          matchValue: r.matchValue,
          action: r.action,
          target: r.target,
        })),
      );
      setFolders(mailboxList.mailboxes.filter((m) => m.role !== 'sent' && m.role !== 'drafts'));
      setFiltersActive(Boolean(data.filters?.active));
      setRulesLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  function addRule() {
    const fallback = folders.find((f) => f.role === 'all' || f.role === 'cur' || f.role === null);
    setRules((prev) => [
      ...prev,
      {
        key: `draft-${ruleCounter.current++}`,
        matchKey: 'from',
        matchValue: '',
        action: 'move',
        target: fallback?.id ?? '',
      },
    ]);
    setFilterNotice('');
  }

  function patchRule(key: string, patch: Partial<RuleDraft>) {
    setRules((prev) => prev.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule)));
    setFilterNotice('');
  }

  function removeRule(key: string) {
    setRules((prev) => prev.filter((rule) => rule.key !== key));
    setFilterNotice('');
  }

  async function saveFilters() {
    setSaving(true);
    setFilterError(null);
    setFilterNotice('');
    try {
      const res = await saveFilterRules(
        rules.map(({ matchKey, matchValue, action, target }) => ({
          matchKey,
          matchValue: matchValue.trim(),
          action,
          target: action === 'junk' ? '' : target,
        })),
        filtersActive,
      );
      setGenerated(res.script);
      setFilterNotice(
        `${res.active ? 'Filters active' : 'Filters saved (inactive)'}, ${rules.length} rule${rules.length === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      setFilterError(err instanceof Error ? err.message : 'The rules did not save.');
    } finally {
      setSaving(false);
    }
  }

  // ── Mail clients ────────────────────────────────────────────────────
  const [clients, setClients] = useState<MailClientConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMailClients()
      .then((config) => {
        if (!cancelled) setClients(config);
      })
      .catch(() => {
        /* the card shows nothing until the server answers */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyField(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((prev) => (prev === label ? null : prev)), 1500);
    } catch {
      /* clipboard refused — the value stays selectable */
    }
  }

  const vacationEndDate = vacation?.endDate ?? null;

  function clientRow(
    label: string,
    value: string,
    copyable: boolean,
    note?: string,
  ) {
    const id = `${label}:${value}`;
    return (
      <div key={id} className="flex items-center justify-between gap-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="truncate font-mono text-xs text-slate-800 dark:text-slate-200">
            {value}
            {note && <span className="ml-2 font-sans text-[11px] text-slate-400">{note}</span>}
          </p>
        </div>
        {copyable && (
          <button
            type="button"
            onClick={() => void copyField(label, value)}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {copied === label ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied === label ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="scroll-area h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{email}</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTab(t.value);
                  setNotice('');
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  tab === t.value
                    ? 'bg-white text-orange-700 shadow-xs dark:bg-slate-900 dark:text-orange-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        {/* ── Auto-reply ────────────────────────────────────────────── */}
        {tab === 'auto-reply' && (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Auto-reply while you're away
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                A vacation reply is the automatic message the server sends to
                anyone who emails you while it is on. Turn it on, say who you
                are and until when — every sender gets the same note, so keep
                it short.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={vacation?.enabled ?? false}
                onChange={(e) =>
                  void post({
                    op: 'vacation',
                    enabled: e.target.checked,
                    subject: vacation?.subject ?? 'Out of office',
                    text: vacation?.text ?? '',
                    startDate: vacation?.startDate ?? null,
                    endDate: vacation?.endDate ?? null,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-600"
              />
              {vacation?.enabled ? 'Auto-reply is on' : 'Auto-reply is off'}
            </label>
            {vacation?.enabled && vacationEndDate && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Replies until{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {vacationEndDate.slice(0, 10)}
                </span>{' '}
                — the server stops on its own.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="vac-start"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Reply from
                </label>
                <input
                  id="vac-start"
                  type="date"
                  defaultValue={vacation?.startDate?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    void post({
                      op: 'vacation',
                      enabled: true,
                      subject: vacation?.subject ?? 'Out of office',
                      text: vacation?.text ?? '',
                      startDate: e.target.value || null,
                      endDate: vacation?.endDate ?? null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="vac-end"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Reply until (optional)
                </label>
                <input
                  id="vac-end"
                  type="date"
                  defaultValue={vacation?.endDate?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    void post({
                      op: 'vacation',
                      enabled: true,
                      subject: vacation?.subject ?? 'Out of office',
                      text: vacation?.text ?? '',
                      startDate: vacation?.startDate ?? null,
                      endDate: e.target.value || null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="vac-subject"
                className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Subject
              </label>
              <input
                id="vac-subject"
                type="text"
                defaultValue={vacation?.subject ?? 'Out of office'}
                onBlur={(e) =>
                  void post({
                    op: 'vacation',
                    enabled: true,
                    subject: e.target.value,
                    text: vacation?.text ?? '',
                    startDate: vacation?.startDate ?? null,
                    endDate: vacation?.endDate ?? null,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="vac-text"
                className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Message
              </label>
              <textarea
                id="vac-text"
                defaultValue={vacation?.text ?? ''}
                rows={3}
                onBlur={(e) =>
                  void post({
                    op: 'vacation',
                    enabled: true,
                    subject: vacation?.subject ?? 'Out of office',
                    text: e.target.value,
                    startDate: vacation?.startDate ?? null,
                    endDate: vacation?.endDate ?? null,
                  })
                }
                placeholder="I'm away until Monday and will reply when I'm back."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Every sender receives the reply — this server cannot limit it to
              your contacts yet. It saves when a field loses focus.
            </p>
          </section>
        )}

        {/* ── Filters & forwarding ──────────────────────────────────── */}
        {tab === 'filters' && (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Filters &amp; forwarding
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                A rule says: when mail matches, do this to it. The app turns
                the rules into the sorting script the server runs on every
                message — no sieve to write by hand.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={filtersActive}
                onChange={(e) => setFiltersActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-600"
              />
              {rules.length
                ? filtersActive
                  ? 'Rules are live on every incoming message'
                  : 'Rules are paused — they will not run'
                : 'Turn the rules live when you save them'}
            </label>

            {!rulesLoaded ? (
              <p className="text-xs text-slate-400">Loading your rules…</p>
            ) : rules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
                No rules yet — the first one takes a minute.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {rules.map((rule) => (
                  <li
                    key={rule.key}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <select
                      value={rule.matchKey}
                      onChange={(e) =>
                        patchRule(rule.key, {
                          matchKey: e.target.value as FilterRuleMatchKey,
                        })
                      }
                      aria-label="What the rule looks at"
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {Object.entries(ruleMatchLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={rule.matchValue}
                      onChange={(e) =>
                        patchRule(rule.key, { matchValue: e.target.value })
                      }
                      placeholder={
                        rule.matchKey === 'from'
                          ? 'e.g. newsletter@example.com'
                          : 'e.g. invoice'
                      }
                      className="min-w-32 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                    <span className="text-xs font-semibold text-slate-400">→</span>
                    <select
                      value={rule.action}
                      onChange={(e) => {
                        const action = e.target.value as FilterRuleAction;
                        const patch: Partial<RuleDraft> = { action };
                        if (action === 'move' && !rule.target) {
                          patch.target = folders[0]?.id ?? '';
                        }
                        if (action === 'junk') patch.target = '';
                        patchRule(rule.key, patch);
                      }}
                      aria-label="What the rule does"
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {Object.entries(ruleActionLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {rule.action === 'move' && (
                      <select
                        value={rule.target}
                        onChange={(e) => patchRule(rule.key, { target: e.target.value })}
                        aria-label="Target folder"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {rule.action === 'forward' && (
                      <input
                        type="email"
                        value={rule.target}
                        onChange={(e) => patchRule(rule.key, { target: e.target.value })}
                        placeholder="you@elsewhere.example"
                        aria-label="Forwarding address"
                        className="min-w-36 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeRule(rule.key)}
                      aria-label="Remove the rule"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={addRule}
                className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/60"
              >
                <Plus className="h-3.5 w-3.5" /> Add a rule
              </button>
              <button
                type="button"
                onClick={() => void saveFilters()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save rules'}
              </button>
            </div>

            {filterError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {filterError}
              </div>
            )}
            {filterNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-4 w-4" /> {filterNotice}
              </div>
            )}

            {generated && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowSieve((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showSieve ? 'rotate-180' : ''}`}
                  />
                  {showSieve ? 'Hide the generated script' : 'View the generated script'}
                </button>
                {showSieve && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
                    {generated}
                  </pre>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Advanced: you can also hand-write the sieve here — the rules
                  above regenerate it on every save.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Mail clients (IMAP / SMTP for external apps) ────────── */}
        {tab === 'clients' && (
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Use this account in other apps
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Add these to Outlook, Thunderbird, Apple Mail — anything that
                speaks IMAP in and SMTP out. The webmail itself talks JMAP and
                needs none of this.
              </p>
            </div>
            {clients ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  <p className="pb-1 font-display text-xs font-bold tracking-wider text-orange-700 dark:text-orange-400">
                    INCOMING — IMAP
                  </p>
                  {clientRow('Host', clients.imap.host, true)}
                  {clientRow('Port', String(clients.imap.port), true)}
                  {clientRow('Encryption', clients.imap.security, false)}
                  {clientRow('Username', clients.imap.username, true)}
                </div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  <p className="pb-1 font-display text-xs font-bold tracking-wider text-orange-700 dark:text-orange-400">
                    OUTGOING — SMTP
                  </p>
                  {clientRow('Host', clients.smtp.host, true)}
                  {clientRow('Port', String(clients.smtp.port), true)}
                  {clientRow('Encryption', clients.smtp.security, false)}
                  {clientRow('Log in', clients.smtp.auth ? 'Yes' : 'No', false)}
                  {clientRow('Username', clients.smtp.username, true)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading the server settings…</p>
            )}
            {clients && (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <p>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Password:
                  </span>{' '}
                  {clients.passwordNote}
                </p>
                <p className="mt-1">
                  If the app says it cannot reach the server, check that ports
                  993 and 465 are open for your connection.
                </p>
              </div>
            )}
          </section>
        )}

        {/* A quiet theme reminder: the switch itself lives in the top bar. */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? (
            <Moon className="h-4 w-4 text-orange-400" />
          ) : (
            <Sun className="h-4 w-4 text-orange-600" />
          )}
          <span>Appearance is set from the top bar — it is shared with the console.</span>
          <KeyRound className="ml-auto h-4 w-4 text-slate-400" />
        </div>

        {busy && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Save className="h-3.5 w-3.5" /> Saving…
          </p>
        )}
        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check className="h-4 w-4" /> {notice}
          </div>
        )}
      </div>
    </div>
  );
}
