'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';

import { getInitials } from '@/lib/mailbox/format';

interface TopBarProps {
  email: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenMobileSidebar: () => void;
}

/**
 * The bar over the panes: the phone's drawer trigger, the search that
 * drives the list's text filter, the theme switch, and the account menu.
 *
 * The reference's notification bell is gone — there is no push stream
 * behind it — and the theme toggle writes the platform's own
 * `fidscript_theme` cookie, the way the console's does, so the choice
 * carries across both apps.
 */
export function TopBar({ email, searchQuery, onSearchChange, onOpenMobileSidebar }: TopBarProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains('light') ? 'light' : 'dark',
    );
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function toggleTheme() {
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

  async function signOut() {
    setProfileOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:gap-6">
      {/* Left: Mobile Menu Trigger + Search Bar */}
      <div className="flex min-w-0 max-w-2xl flex-1 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails by sender, subject, or keyword..."
            aria-label="Search emails"
            className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Theme Toggle + Profile Menu */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-orange-400" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex min-h-[40px] items-center gap-2 rounded-lg py-1 pl-1.5 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Account menu"
            aria-expanded={profileOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-orange-600/10 font-display text-xs font-bold text-orange-700 dark:border-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
              {getInitials(email.split('@')[0])}
            </span>
            <span className="hidden max-w-[140px] text-left md:block">
              <span className="block truncate text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                {email.split('@')[0]}
              </span>
              <span className="block truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                {email}
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:w-72">
              <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-600/10 font-display text-sm font-bold text-orange-700 dark:border-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                  {getInitials(email.split('@')[0])}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {email}
                  </div>
                </div>
              </div>

              <div className="space-y-0.5 p-1.5">
                <Link
                  href="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <LayoutDashboard className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Settings</span>
                </Link>
              </div>

              <div className="border-t border-slate-200 p-1.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
