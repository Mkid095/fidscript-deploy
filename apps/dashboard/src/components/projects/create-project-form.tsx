'use client';

import { Button } from '@fidscript/ui';
import { PROJECT_TYPES } from './create-project-types';

interface CreateProjectFormProps {
  name: string;
  onNameChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  slugLocked: boolean;
  onSlugLockToggle: () => void;
  type: string;
  onTypeChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  checking: boolean;
  duplicateError: string | null;
  submitting: boolean;
  canSubmit: boolean;
  submitError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  nameRef: React.RefObject<HTMLInputElement | null>;
}

export function CreateProjectForm({
  name, onNameChange,
  slug, onSlugChange, slugLocked, onSlugLockToggle,
  type, onTypeChange,
  description, onDescriptionChange,
  checking, duplicateError,
  submitting, canSubmit, submitError,
  onSubmit, onCancel, nameRef,
}: CreateProjectFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {submitError && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-[var(--danger)]/30 text-sm text-[var(--danger)]">
          {submitError}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5">
          Project name <span className="text-[var(--danger)]">*</span>
        </label>
        <div className="relative">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder="my-project"
            maxLength={40}
            className={`w-full bg-[var(--surface-2)] border text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] pr-16 ${
              duplicateError ? 'border-[var(--danger)]' : name && !checking && !duplicateError ? 'border-[var(--success)]/50' : 'border-[var(--rail)]'
            }`}
          />
          {checking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 border border-slate-500 border-t-blue-400 rounded-full animate-spin" />
            </div>
          )}
        </div>
        {duplicateError && <p className="text-xs text-[var(--danger)] mt-1">{duplicateError}</p>}
        {!duplicateError && name && name.length < 3 && (
          <p className="text-xs text-[var(--text-muted)] mt-1">At least 3 characters</p>
        )}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5">
          URL slug
          <button
            type="button"
            onClick={onSlugLockToggle}
            className="ml-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]"
          >
            {slugLocked ? 'locked' : 'auto'}
          </button>
        </label>
        <input
          type="text"
          value={slug}
          onChange={e => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="my-project"
          className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
        />
        <p className="text-xs text-[var(--text-muted)] mt-1">deploy.fidscript.com/{slug || '…'}</p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5">Project type</label>
        <div className="grid grid-cols-3 gap-2">
          {PROJECT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onTypeChange(t.value)}
              className={`p-2 rounded-lg border text-left transition ${
                type === t.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]'
                  : 'border-[var(--rail)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--rail-light)]'
              }`}
              title={t.description}
            >
              <div className="text-xs font-medium">{t.label}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {PROJECT_TYPES.find(t => t.value === type)?.description}
        </p>
      </div>

      {/* Description */}
      <details className="group">
        <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-muted)] list-none flex items-center gap-1">
          Add description (optional)
        </summary>
        <textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="What does this project do?"
          maxLength={200}
          rows={2}
          className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] mt-2 resize-none"
        />
      </details>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit} loading={submitting}>
          Create project
        </Button>
      </div>
    </form>
  );
}
