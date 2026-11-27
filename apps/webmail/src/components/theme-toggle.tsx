'use client';

import { useEffect, useState } from 'react';

/**
 * The light/dark switch.
 *
 * It writes the platform's own `fidscript_theme` cookie — the same one the
 * console reads and writes — so the operator's choice in one app is the
 * other's default. The class flips on the page without a reload; the next
 * paint anywhere in the domain answers with the same theme.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains('light') ? 'light' : 'dark',
    );
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.classList.toggle('light', next === 'light');
    setTheme(next);

    const base = `fidscript_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    // On the platform's own domain the cookie is written for the whole
    // domain, so the console and the webmail share one preference;
    // elsewhere (a standalone install) it stays on the host itself.
    document.cookie =
      window.location.hostname.endsWith('fidscript.com')
        ? `${base}; domain=.fidscript.com`
        : base;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      title={theme === 'dark' ? 'The light theme' : 'The dark theme'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {theme === 'dark' ? (
        // The sun: what it will switch to.
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
        </svg>
      ) : (
        // The moon: what it will switch to.
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
