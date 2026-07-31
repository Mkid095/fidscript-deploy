// ProjectForm component used by both Create and Edit right panels

import { Input } from '@fidscript/ui';
import type { ProjectType } from './projects-utils';
import { PROJECT_TYPES } from './projects-utils';

interface ProjectFormProps {
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  slug: string;
  error: string | null;
  descriptionPlaceholder?: string;
  nameLabel?: string;
  showType?: boolean;
  type?: ProjectType;
  onTypeChange?: (v: ProjectType) => void;
  slugLabel?: string;
}

export function ProjectForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  slug,
  error,
  descriptionPlaceholder = 'What does this project do?',
  nameLabel = 'Project name',
  showType,
  type = 'frontend',
  onTypeChange,
  slugLabel,
}: ProjectFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Input
          label={nameLabel}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="my-app"
          autoFocus
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
        />
        {name && slugLabel ? (
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Slug: <span className="font-mono text-[var(--text-muted)]">{slugLabel}</span>
          </p>
        ) : name && slug ? (
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Slug preview: <span className="font-mono text-[var(--text-muted)]">{slug}</span>
            <span className="text-[var(--text-dim)]"> (a suffix will be added)</span>
          </p>
        ) : null}
      </div>

      {showType && onTypeChange && (
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Type</label>
          <select
            value={type}
            onChange={e => onTypeChange(e.target.value as ProjectType)}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--warning)]"
          >
            {PROJECT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          rows={3}
          className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--warning)]"
        />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
