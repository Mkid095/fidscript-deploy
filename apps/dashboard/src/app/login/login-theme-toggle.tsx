'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, Sun01Icon as SunIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

type LoginTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'fidscript_theme';

function getRestoredTheme(): LoginTheme {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function LoginThemeToggle() {
  const [theme, setTheme] = useState<LoginTheme>('dark');

  useEffect(() => {
    const restoredTheme = getRestoredTheme();
    setTheme(restoredTheme);
    document.documentElement.setAttribute('data-theme', restoredTheme);
    document.documentElement.style.colorScheme = restoredTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
  }

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg border border-[var(--rail-light)] bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors hover:border-[var(--rail)] hover:text-[var(--text)]"
    >
      <HugeiconsIcon icon={isDark ? SunIcon : MoonIcon} size={16} strokeWidth={1.7} />
    </button>
  );
}
