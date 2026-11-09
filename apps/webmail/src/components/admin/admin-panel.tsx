'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import {
  Badge,
  Card,
  EmptyState,
  Field,
  PrimaryButton,
  TextInput,
} from '@/components/ui';
import { SignOut } from '@/components/sign-out';

interface Account {
  id: string;
  name: string;
  email: string;
  domainId: string;
  isEnabled: boolean;
  quotaBytes: number | null;
}

interface Domain {
  id: string;
  name: string;
  isEnabled: boolean;
  dkimSelectors: string[];
  hasDnsZone: boolean;
}

interface Alias {
  id: string;
  name: string;
  email: string;
  domainId: string;
  isEnabled: boolean;
}

interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  ip: string;
}

type Tab = 'accounts' | 'domains' | 'aliases' | 'audit';

/**
 * The admin area: accounts, domains, aliases, and the audit trail.
 *
 * Everything here is a server-side call over the admin JMAP surface, run
 * for the platform admin and recorded in the audit log. The admin is
 * managing mailboxes and domains, not reading anyone's mail — and the
 * routes are guarded so a mailbox session gets none of this.
 */
export function AdminPanel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      fetch('/api/admin/accounts').then((r) => r.json()),
      fetch('/api/admin/domains').then((r) => r.json()),
      fetch('/api/admin/aliases').then((r) => r.json()),
      fetch('/api/admin/audit').then((r) => r.json()),
    ]);
    const [a, d, al, au] = results;
    if (a.status === 'fulfilled') setAccounts((a.value as { accounts?: Account[] }).accounts ?? []);
    if (d.status === 'fulfilled') setDomains((d.value as { domains?: Domain[] }).domains ?? []);
    if (al.status === 'fulfilled') setAliases((al.value as { aliases?: Alias[] }).aliases ?? []);
    if (au.status === 'fulfilled') setAudit((au.value as { entries?: AuditEntry[] }).entries ?? []);
    const firstError = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason);
    if (firstError.length) setError(String(firstError[0]));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function op(endpoint: string, body: Record<string, unknown>, note?: string) {
    setError(null);
    setNotice(null);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!response.ok) {
      setError(json.error ?? 'That did not work.');
      return;
    }
    if (note) setNotice(note);
    void load();
  }

  const tabs: Array<[Tab, string]> = [
    ['accounts', `Accounts (${accounts.length})`],
    ['domains', `Domains (${domains.length})`],
    ['aliases', `Aliases (${aliases.length})`],
    ['audit', 'Audit'],
  ];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-rail bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-text">
            Webmail
          </Link>
          <Badge tone="accent">admin</Badge>
          <span className="text-xs text-text-dim">{email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-accent hover:underline">
            Dashboard
          </Link>
          <SignOut />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-semibold text-text">Administration</h1>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-rail">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-t px-3 py-1.5 text-sm ${
                tab === key
                  ? 'border border-b-0 border-rail bg-surface text-text'
                  : 'text-text-muted hover:bg-surface-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          {notice ? <p className="mb-3 text-sm text-success">{notice}</p> : null}

          {tab === 'accounts' ? (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card title="Accounts">
                {accounts.length === 0 ? (
                  <EmptyState title="No accounts yet" body="Create the first mailbox below." />
                ) : (
                  <ul className="divide-y divide-rail">
                    {accounts.map((account) => (
                      <li key={account.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-text">{account.email}</p>
                          <p className="text-xs text-text-dim">
                            {account.quotaBytes
                              ? `quota ${(account.quotaBytes / 1024 ** 3).toFixed(1)} GB`
                              : 'no quota'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone={account.isEnabled ? 'success' : 'warning'}>
                            {account.isEnabled ? 'active' : 'suspended'}
                          </Badge>
                          <button
                            type="button"
                            onClick={() =>
                              void op('/api/admin/accounts', {
                                op: account.isEnabled ? 'suspend' : 'activate',
                                id: account.id,
                              }, account.isEnabled ? 'Suspended.' : 'Activated.')
                            }
                            className="text-xs text-accent hover:underline"
                          >
                            {account.isEnabled ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const password = prompt('New password (8+ characters):');
                              if (password && password.length >= 8) {
                                void op('/api/admin/accounts', {
                                  op: 'password',
                                  id: account.id,
                                  password,
                                }, 'Password set.');
                              }
                            }}
                            className="text-xs text-accent hover:underline"
                          >
                            Reset password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete ${account.email}? This removes the mailbox from Stalwart.`)) {
                                void op('/api/admin/accounts', { op: 'delete', id: account.id }, 'Deleted.');
                              }
                            }}
                            className="text-xs text-danger hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="New mailbox">
                <CreateAccount
                  domains={domains}
                  onCreated={(note) => {
                    void load();
                    setNotice(note);
                  }}
                />
              </Card>
            </div>
          ) : null}

          {tab === 'domains' ? (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card title="Domains">
                {domains.length === 0 ? (
                  <EmptyState title="No domains" body="Add the platform's mail domain to start." />
                ) : (
                  <ul className="divide-y divide-rail">
                    {domains.map((domain) => (
                      <li key={domain.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-text">{domain.name}</p>
                          <p className="text-xs text-text-dim">
                            {domain.dkimSelectors.length
                              ? `DKIM ${domain.dkimSelectors.join(', ')}`
                              : 'no DKIM policy'}
                          </p>
                        </div>
                        <Badge tone={domain.isEnabled ? 'success' : 'warning'}>
                          {domain.isEnabled ? 'enabled' : 'disabled'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Add domain">
                <CreateDomain onCreated={(note) => {
                    void load();
                    setNotice(note);
                  }} />
              </Card>
            </div>
          ) : null}

          {tab === 'aliases' ? (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card title="Aliases">
                {aliases.length === 0 ? (
                  <EmptyState
                    title="No aliases"
                    body="An alias is an address with no mailbox of its own, that resolves to the accounts that hold it."
                  />
                ) : (
                  <ul className="divide-y divide-rail">
                    {aliases.map((alias) => (
                      <li key={alias.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="truncate font-mono text-sm text-text">{alias.email}</span>
                        <Badge tone={alias.isEnabled ? 'success' : 'warning'}>
                          {alias.isEnabled ? 'active' : 'disabled'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="New alias">
                <CreateAlias
                  domains={domains}
                  onCreated={(note) => {
                    void load();
                    setNotice(note);
                  }}
                />
              </Card>
            </div>
          ) : null}

          {tab === 'audit' ? (
            <Card title="Audit trail" description="What the admin has done, newest first.">
              {audit.length === 0 ? (
                <EmptyState title="Nothing recorded yet" />
              ) : (
                <ul className="divide-y divide-rail">
                  {audit.map((entry) => (
                    <li key={entry.action + entry.at} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-text-muted">{entry.action}</span>
                        <span className="text-xs text-text-dim">
                          {new Date(entry.at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-text-dim">
                        {entry.actor} · {JSON.stringify(entry.detail)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function CreateAccount({
  domains,
  onCreated,
}: {
  domains: Domain[];
  onCreated: (note: string) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState(domains[0]?.name ?? '');
  const [password, setPassword] = useState('');
  const [quotaMb, setQuotaMb] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const response = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'create',
        name,
        domain,
        password,
        quotaMb: quotaMb ? Number(quotaMb) : undefined,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      account?: Account;
      error?: string;
    };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? 'The mailbox could not be created.');
      return;
    }
    setName('');
    setPassword('');
    setQuotaMb('');
    onCreated(`Created ${body.account?.email}.`);
  }

  return (
    <div className="space-y-3">
      <Field label="Local part">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="kennedy" />
      </Field>
      <Field label="Domain">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
        >
          {domains.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
          {domains.length === 0 ? <option value="">(add a domain first)</option> : null}
        </select>
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Quota (GB)" hint="Optional.">
        <TextInput
          type="number"
          min="1"
          value={quotaMb}
          onChange={(e) => setQuotaMb(e.target.value)}
          placeholder="e.g. 10"
        />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <PrimaryButton
        type="button"
        onClick={() => void create()}
        disabled={busy || !name || !domain || password.length < 8}
        className="w-full"
      >
        {busy ? 'Creating…' : 'Create mailbox'}
      </PrimaryButton>
    </div>
  );
}

function CreateDomain({ onCreated }: { onCreated: (note: string) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const response = await fetch('/api/admin/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'create', name }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? 'The domain could not be added.');
      return;
    }
    setName('');
    onCreated(`Domain ${name} added. Point its MX at the server and it will answer.`);
  }

  return (
    <div className="space-y-3">
      <Field label="Domain" hint="The name mail arrives for.">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="fidscript.com" />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <PrimaryButton type="button" onClick={() => void create()} disabled={busy || !name} className="w-full">
        {busy ? 'Adding…' : 'Add domain'}
      </PrimaryButton>
    </div>
  );
}

function CreateAlias({
  domains,
  onCreated,
}: {
  domains: Domain[];
  onCreated: (note: string) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState(domains[0]?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const response = await fetch('/api/admin/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'create', name, domain }),
    });
    const body = (await response.json().catch(() => ({}))) as { alias?: Alias; error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? 'The alias could not be created.');
      return;
    }
    setName('');
    onCreated(`Created ${body.alias?.email}.`);
  }

  return (
    <div className="space-y-3">
      <Field label="Local part">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="support" />
      </Field>
      <Field label="Domain">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
        >
          {domains.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
          {domains.length === 0 ? <option value="">(add a domain first)</option> : null}
        </select>
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <PrimaryButton type="button" onClick={() => void create()} disabled={busy || !name || !domain} className="w-full">
        {busy ? 'Creating…' : 'Create alias'}
      </PrimaryButton>
    </div>
  );
}
