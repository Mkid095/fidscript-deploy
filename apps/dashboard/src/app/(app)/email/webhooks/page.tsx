'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, Card, EmptyState, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { CreateWebhookModal } from './create-webhook-modal';

interface WebhookSub {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastStatus?: string | null;
  lastSentAt?: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

export default function WebhooksPage() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [webhooks, setWebhooks] = useState<WebhookSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getSdk().email.listWebhooks(projectId);
      setWebhooks(list);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { load(); }, [load]);

  async function handleTest(id: string) {
    if (!projectId) return;
    setTesting(id);
    try {
      await getSdk().email.testWebhook(projectId, id);
      load();
    } catch { /* ignore */ } finally {
      setTesting(null);
    }
  }

  async function handleToggle(wh: WebhookSub) {
    if (!projectId) return;
    try {
      await getSdk().email.updateWebhook(projectId, wh.id, { isActive: !wh.isActive });
      load();
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!projectId) return;
    try {
      await getSdk().email.deleteWebhook(projectId, id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email Webhooks</h1>
          <p className="text-sm text-[var(--text-muted)]">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Add Webhook</Button>
      </div>

      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-xs text-[var(--warning)] mb-4">
        Webhook payloads are signed with HMAC-SHA256 only when <code className="font-mono">STALWART_WEBHOOK_SECRET</code> is configured on the server.
        If unset, webhook deliveries are unauthenticated — any party who knows your endpoint URL can post events.
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-48"><Spinner size="lg" /></div>
      ) : webhooks.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No email webhooks"
            description="Register webhook URLs to receive real-time email lifecycle events — deliveries, opens, clicks, bounces."
            action={<Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Add Webhook</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => (
            <Card key={wh.id} className="border border-[var(--rail)] p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[var(--text)] truncate">{wh.url}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wh.isActive ? 'bg-emerald-900 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                      {wh.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map(ev => (
                      <span key={ev} className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text-muted)]">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => handleTest(wh.id)} loading={testing === wh.id}>Test</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(wh)}>{wh.isActive ? 'Disable' : 'Enable'}</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(wh.id)}>Delete</Button>
                </div>
              </div>
              <div className="flex gap-6 text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--rail)]">
                <span>{wh.successCount} delivered</span>
                <span>{wh.failureCount} failed</span>
                <span>Last: {wh.lastStatus ?? '—'}</span>
                {wh.lastSentAt && <span>{new Date(wh.lastSentAt).toLocaleString()}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWebhookModal
          projectId={projectId!}
          getSdk={getSdk}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
