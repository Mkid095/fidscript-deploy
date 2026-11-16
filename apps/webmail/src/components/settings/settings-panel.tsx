'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Button, Card, Field, PrimaryButton, TextInput } from '@/components/ui';

interface Identity {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  signatureHtml: string | null;
  signatureText: string | null;
}

interface Vacation {
  enabled: boolean;
  subject: string;
  text: string;
}

interface SettingsState {
  identities: Identity[];
  vacation: Vacation | null;
  filters: { script: string; active: boolean } | null;
}

/**
 * The mailbox's settings.
 *
 * What Stalwart owns (identities, signatures, the vacation responder, the
 * sieve filter) is written through the settings endpoint to Stalwart. What
 * is this app's own — the display preferences — lives in the browser.
 * Forwarding is done the honest way: a sieve `redirect` rule, and we say
 * so.
 */
export function SettingsPanel({ email }: { email: string }) {
  const [tab, setTab] = useState('general');
  const [data, setData] = useState<SettingsState>({
    identities: [],
    vacation: null,
    filters: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((response) => response.json())
      .then((body: SettingsState) => {
        setData({
          identities: body.identities ?? [],
          vacation: body.vacation ?? null,
          filters: body.filters ?? null,
        });
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  async function post(payload: Record<string, unknown>) {
    setNotice(null);
    setError(null);
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!response.ok) {
      setError(body.error ?? 'That did not save.');
    } else {
      setNotice('Saved.');
      void refresh();
    }
  }

  async function refresh() {
    const response = await fetch('/api/settings');
    const body = (await response.json()) as SettingsState;
    setData({
      identities: body.identities ?? [],
      vacation: body.vacation ?? null,
      filters: body.filters ?? null,
    });
  }

  const identity = data.identities[0];

  const tabs = [
    ['general', 'General'],
    ['identities', 'Identities & Signatures'],
    ['vacation', 'Vacation'],
    ['filters', 'Filters'],
  ] as const;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-text">Settings</h1>
      <p className="mt-1 text-sm text-text-muted">{email}</p>

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
        {error ? (
          <p className="mb-3 text-sm text-danger">{error}</p>
        ) : null}
        {notice ? <p className="mb-3 text-sm text-success">{notice}</p> : null}

        {tab === 'general' ? (
          <Card title="Display">
            <p className="text-sm text-text-muted">
              These are this browser&apos;s own preferences; they do not travel to
              Stalwart and they do not outlive the browser.
            </p>
            <div className="mt-3 space-y-3">
              <Field label="Preferred language">
                <select
                  defaultValue="en"
                  className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
                >
                  <option value="en">English</option>
                  <option value="auto">Match the system</option>
                </select>
              </Field>
              <Field label="Time zone">
                <select
                  defaultValue="auto"
                  className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
                >
                  <option value="auto">System time zone</option>
                  <option value="utc">UTC</option>
                </select>
              </Field>
              <Field label="Thread view">
                <select
                  defaultValue="threads"
                  className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
                >
                  <option value="threads">Group into threads</option>
                  <option value="messages">Flat list of messages</option>
                </select>
              </Field>
              <Field label="Density">
                <select
                  defaultValue="comfortable"
                  className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </Field>
            </div>
          </Card>
        ) : null}

        {tab === 'identities' ? (
          <Card
            title="Identity and signature"
            description="The sending identity Stalwart keeps for this account."
          >
            {!identity ? (
              <p className="text-sm text-text-dim">
                No identity yet — the first one appears when the account is
                used.
              </p>
            ) : (
              <div className="space-y-3">
                <Field label="Sender name">
                  <p className="rounded border border-rail bg-surface-2 px-3 py-1.5 text-sm text-text-dim">
                    {identity.name || identity.email}{' '}
                    <span className="text-xs">
                      (the account's own name; Stalwart keeps it fixed)
                    </span>
                  </p>
                </Field>
                <Field label="Signature (HTML)">
                  <textarea
                    key={`sig-${identity.id}`}
                    defaultValue={identity.signatureHtml ?? ''}
                    rows={4}
                    onBlur={(event) =>
                      void post({
                        op: 'identity',
                        id: identity.id,
                        signatureHtml: event.target.value,
                      })
                    }
                    className="w-full rounded border border-rail bg-surface p-3 text-sm outline-none focus:border-rail-light"
                  />
                  <p className="mt-1 text-xs text-text-dim">
                    Saved on blur. Appended to plain replies; HTML mail keeps
                    the HTML signature.
                  </p>
                </Field>
              </div>
            )}
          </Card>
        ) : null}

        {tab === 'vacation' ? (
          <Card
            title="Vacation responder"
            description="An automatic reply while you are away, kept by Stalwart."
          >
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.vacation?.enabled ?? false}
                  onChange={(event) =>
                    void post({
                      op: 'vacation',
                      enabled: event.target.checked,
                      subject: data.vacation?.subject ?? 'Out of office',
                      text: data.vacation?.text ?? '',
                    })
                  }
                />
                Enabled
              </label>
              <Field label="Subject">
                <TextInput
                  key={`vsub-${data.vacation?.enabled ?? 0}`}
                  defaultValue={data.vacation?.subject ?? 'Out of office'}
                  onBlur={(event) =>
                    void post({
                      op: 'vacation',
                      enabled: data.vacation?.enabled ?? true,
                      subject: event.target.value,
                      text: data.vacation?.text ?? '',
                    })
                  }
                />
              </Field>
              <Field label="Message">
                <textarea
                  key={`vtxt-${data.vacation?.enabled ?? 0}`}
                  defaultValue={data.vacation?.text ?? ''}
                  rows={4}
                  onBlur={(event) =>
                    void post({
                      op: 'vacation',
                      enabled: data.vacation?.enabled ?? true,
                      subject: data.vacation?.subject ?? '',
                      text: event.target.value,
                    })
                  }
                  className="w-full rounded border border-rail bg-surface p-3 text-sm outline-none focus:border-rail-light"
                />
              </Field>
              <Button type="button" onClick={() => void refresh()}>
                Reload
              </Button>
            </div>
          </Card>
        ) : null}

        {tab === 'filters' ? (
          <Card
            title="Filters and forwarding"
            description="A sieve script Stalwart runs on every message it delivers to you. Forwarding is a `redirect` rule — the app keeps the script, Stalwart runs it."
          >
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.filters?.active ?? false}
                  onChange={(event) =>
                    void post({
                      op: 'filters',
                      script: data.filters?.script ?? '',
                      active: event.target.checked,
                    })
                  }
                />
                Active
              </label>
              <textarea
                key={`filter-${data.filters?.active ?? 0}`}
                defaultValue={data.filters?.script ?? ''}
                rows={8}
                spellCheck={false}
                onBlur={(event) =>
                  void post({
                    op: 'filters',
                    script: event.target.value,
                    active: data.filters?.active ?? true,
                  })
                }
                className="w-full rounded border border-rail bg-surface-2 p-3 font-mono text-xs outline-none focus:border-rail-light"
                placeholder={`# Move mail from the newsletter list to a folder\nif header ["From"] = "newsletter@example.com" {\n  fileinto "Newsletters";\n}\n\n# Forward a copy to another address\nif true {\n  redirect "you@elsewhere.example";\n}`}
              />
              <p className="text-xs text-text-dim">
                Saved on blur. A forwarding example is in the box — replace the
                address with your own.
              </p>
            </div>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/mail/inbox" className="text-sm text-accent hover:underline">
          Back to the inbox
        </Link>
        <Link href="/contacts" className="text-sm text-accent hover:underline">
          Contacts
        </Link>
      </div>
    </main>
  );
}
