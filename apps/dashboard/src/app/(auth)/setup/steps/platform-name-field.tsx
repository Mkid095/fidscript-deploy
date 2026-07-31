'use client';

interface PlatformNameFieldProps {
  value: string;
  onChange: (v: string) => void;
}

export function PlatformNameField({ value, onChange }: PlatformNameFieldProps) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] mb-1.5">Platform Name</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="FIDScript Deploy"
        className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]"
      />
    </div>
  );
}
