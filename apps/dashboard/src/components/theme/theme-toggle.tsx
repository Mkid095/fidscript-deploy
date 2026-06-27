'use client';

import { useEffect, useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon01Icon, ComputerIcon } from '@hugeicons/core-free-icons';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'fidscript_theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  // Load stored preference + apply on mount
  useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as Theme | null;
    const initial: Theme = stored ?? 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  // React to system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const set = useCallback((next: Theme) => {
    setTheme(next);
    if (typeof window !== 'undefined') {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    }
    applyTheme(next);
  }, []);

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-[var(--rail)] p-0.5 bg-[var(--surface)]">
      {([
        { key: 'light',  icon: Sun01Icon,       label: 'Light' },
        { key: 'dark',   icon: Moon01Icon,      label: 'Dark' },
        { key: 'system', icon: ComputerIcon,    label: 'System' },
      ] as const).map((opt) => (
        <button
          key={opt.key}
          onClick={() => set(opt.key)}
          title={opt.label}
          aria-label={opt.label}
          className={`flex items-center justify-center h-6 w-6 rounded transition-colors ${
            theme === opt.key
              ? 'bg-[var(--active)] text-[var(--text)]'
              : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
          }`}
        >
          <HugeiconsIcon icon={opt.icon} size={13} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
