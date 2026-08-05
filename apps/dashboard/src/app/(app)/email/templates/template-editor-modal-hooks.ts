'use client';

import { useState } from 'react';

interface TemplateVariable {
  name: string;
  required?: boolean;
  default?: string;
}

interface TemplateFormData {
  name: string;
  description?: string;
  fromAddress?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  variables: Array<{ name: string }>;
}

interface UseTemplateEditorOptions {
  projectId: string;
  template: { id: string } | null;
  getSdk: () => { email: {
    createTemplate: (projectId: string, data: Omit<TemplateFormData, 'variables'> & { variables?: TemplateVariable[] }) => Promise<unknown>;
    updateTemplate: (projectId: string, templateId: string, data: Partial<TemplateFormData>) => Promise<unknown>;
  }};
}

interface UseTemplateEditorResult {
  saving: boolean;
  error: string | null;
  saveTemplate: (data: TemplateFormData) => Promise<void>;
}

export function useTemplateEditor({ projectId, template, getSdk }: UseTemplateEditorOptions): UseTemplateEditorResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveTemplate(data: TemplateFormData): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const sdk = getSdk();
      if (template) {
        await sdk.email.updateTemplate(projectId, template.id, data);
      } else {
        await sdk.email.createTemplate(projectId, data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, saveTemplate };
}
