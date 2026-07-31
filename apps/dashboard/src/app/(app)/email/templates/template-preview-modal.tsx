'use client';

import { Modal } from '@fidscript/ui';

interface TemplatePreviewModalProps {
  template: { name: string };
  previewData: { rendered: { subject: string; html?: string; text?: string } } | null;
  onClose: () => void;
}

export function TemplatePreviewModal({ template, previewData, onClose }: TemplatePreviewModalProps) {
  return (
    <Modal isOpen onClose={onClose} title={`Preview: ${template.name}`}>
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
              <iframe
                srcDoc={previewData.rendered.html}
                className="w-full h-64 border border-[var(--rail)] rounded bg-white"
                title="Template preview"
              />
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
  );
}
