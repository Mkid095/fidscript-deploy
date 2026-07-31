'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, Card, EmptyState, Modal, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { TemplateEditor } from './template-editor-modal';

interface Template {
  id: string;
  name: string;
  description?: string;
  fromAddress?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  variables: Array<{ name: string; required?: boolean; default?: string }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getSdk().email.listTemplates(projectId);
      setTemplates(list as Template[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { load(); }, [load]);

  async function handlePreview(t: Template) {
    try {
      const data = await getSdk().email.previewTemplate(projectId!, t.id);
      setPreviewData(data);
      setPreviewing(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email Templates</h1>
          <p className="text-sm text-[var(--text-muted)]">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>New Template</Button>
      </div>

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center min-h-48"><Spinner size="lg" /></div>
      ) : templates.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No email templates yet"
            description="Create reusable templates for transactional emails — welcome messages, password resets, notifications."
            action={<Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>New Template</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)] font-mono">{t.name}</h3>
                  {t.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-900 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                  {t.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                <p className="truncate"><span className="text-[var(--text-dim)]">Subject:</span> {t.subject}</p>
                <p><span className="text-[var(--text-dim)]">From:</span> {t.fromAddress ?? '—'}</p>
                <p><span className="text-[var(--text-dim)]">Variables:</span> {t.variables?.length ?? 0}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => handlePreview(t)}>Preview</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editing) && (
        <TemplateEditor
          template={editing}
          projectId={projectId!}
          getSdk={getSdk}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { setShowCreate(false); setEditing(null); load(); }}
        />
      )}

      {previewing && (
        <Modal
          isOpen
          onClose={() => { setPreviewing(null); setPreviewData(null); }}
          title={`Preview: ${previewing.name}`}
        >
          {previewData && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Rendered Subject</label>
                <div className="text-sm text-[var(--text)] bg-[var(--surface-2)] border border-[var(--rail)] rounded px-3 py-2">
                  {previewData.rendered.subject}
                </div>
              </div>
              {previewData.rendered.html && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">HTML Body</label>
                  <iframe srcDoc={previewData.rendered.html} className="w-full h-64 border border-[var(--rail)] rounded bg-white" title="Template preview" />
                </div>
              )}
              {previewData.rendered.text && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Text Body</label>
                  <pre className="text-xs text-[var(--text)] bg-[var(--surface-2)] border border-[var(--rail)] rounded p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {previewData.rendered.text}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
