'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

interface Template {
  id: string;
  name: string;
  description?: string;
  fromAddress?: string;
  fromName?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  variables: Array<{ name: string; required?: boolean; default?: string }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateEditorProps {
  template: Template | null;
  projectId: string;
  getSdk: () => any;
  onClose: () => void;
  onSaved: () => void;
}

export function TemplateEditor({ template, projectId, getSdk, onClose, onSaved }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [fromAddress, setFromAddress] = useState(template?.fromAddress ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [htmlBody, setHtmlBody] = useState(template?.htmlBody ?? '');
  const [textBody, setTextBody] = useState(template?.textBody ?? '');
  const [vars, setVars] = useState((template?.variables ?? []).map(v => v.name).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sdk = getSdk();
      const variables = vars.split(',').map(v => v.trim()).filter(Boolean).map(v => ({ name: v }));
      const data = { name: name.trim(), description: description || undefined, fromAddress: fromAddress || undefined, subject, htmlBody: htmlBody || undefined, textBody: textBody || undefined, variables };
      if (template) {
        await sdk.email.updateTemplate(projectId, template.id, data);
      } else {
        await sdk.email.createTemplate(projectId, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={template ? `Edit: ${template.name}` : 'New Template'}>
      <form onSubmit={handleSave} noValidate className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="welcome" disabled={!!template} className="bg-[var(--surface-2)] border border-[var(--rail)] w-full" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">From Address</label>
            <Input value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="noreply@example.com" className="bg-[var(--surface-2)] border border-[var(--rail)] w-full" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Sent after user signup" className="bg-[var(--surface-2)] border border-[var(--rail)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Subject * <span className="text-[var(--text-dim)]">(supports {'{{variables}}'})</span></label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Welcome to {{appName}}!" className="bg-[var(--surface-2)] border border-[var(--rail)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">HTML Body <span className="text-[var(--text-dim)]">(supports {'{{variables}}'})</span></label>
          <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} rows={5} placeholder={'<h1>Welcome, {{name}}!</h1>'} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full font-mono" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Plain Text Body</label>
          <textarea value={textBody} onChange={e => setTextBody(e.target.value)} rows={3} placeholder="Welcome, {{name}}!" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full font-mono" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Variables <span className="text-[var(--text-dim)]">(comma-separated)</span></label>
          <Input value={vars} onChange={e => setVars(e.target.value)} placeholder="name, appName, actionUrl" className="bg-[var(--surface-2)] border border-[var(--rail)] w-full" />
        </div>
        {error && <p className="text-[var(--danger)] text-xs">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={saving}>{saving ? 'Saving...' : 'Save Template'}</Button>
        </div>
      </form>
    </Modal>
  );
}
