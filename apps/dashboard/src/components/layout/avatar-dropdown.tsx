'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon, Logout01Icon, ChevronDownIcon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';

function getInitials(name?: string, email?: string): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return '?';
}

function getAvatarColor(name?: string): string {
  // Pick a deterministic warm color from the user's name
  const colors = [
    'bg-orange-600',
    'bg-amber-600',
    'bg-red-600',
    'bg-rose-600',
    'bg-pink-600',
    'bg-fuchsia-600',
    'bg-purple-600',
    'bg-violet-600',
    'bg-indigo-600',
    'bg-blue-600',
    'bg-cyan-600',
    'bg-teal-600',
    'bg-emerald-600',
  ];
  const idx = (name ?? 'x').charCodeAt(0) % colors.length;
  return colors[idx];
}

export function AvatarDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(user?.name, user?.email);
  const color = getAvatarColor(user?.name);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[#1e2130] border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors cursor-pointer"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div
          className={`w-7 h-7 rounded-full ${color} text-white text-xs font-semibold flex items-center justify-center flex-shrink-0`}
        >
          {initials}
        </div>
        <span className="hidden md:inline text-xs text-slate-300 max-w-[140px] truncate">
          {user.name || user.email}
        </span>
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={12}
          className={`hidden md:block text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 bg-[#0f1217] border border-[#1e2130] rounded-xl shadow-xl shadow-black/40 z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-[#1e2130]">
            <p className="text-sm font-medium text-slate-200 truncate">{user.name || 'Your account'}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-300 hover:bg-[#1e2130] hover:text-slate-100 transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Settings02Icon} size={15} className="text-slate-500" />
              Account settings
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logout();
                router.push('/login');
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-[#1e2130] hover:text-red-300 transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Logout01Icon} size={15} className="text-red-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
