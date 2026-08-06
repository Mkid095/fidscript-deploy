'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
    'bg-[var(--warning)]',
    'bg-[var(--warning)]',
    'bg-[var(--danger)]',
    'bg-[var(--danger)]',
    'bg-[var(--brand)]',
    'bg-[var(--brand)]',
    'bg-[var(--brand)]',
    'bg-[var(--accent)]',
    'bg-[var(--accent)]',
    'bg-[var(--accent-dim)]',
    'bg-[var(--info)]',
    'bg-[var(--success)]',
    'bg-[var(--success)]',
  ];
  const idx = (name ?? 'x').charCodeAt(0) % colors.length;
  return colors[idx];
}

interface MenuItem {
  key: string;
  kind: 'link' | 'button';
  href?: string;
  onSelect?: () => void;
}

export function AvatarDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const menuId = useId();
  const initials = getInitials(user?.name, user?.email);
  const color = getAvatarColor(user?.name);

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    router.push('/login');
  };

  const items: MenuItem[] = [
    {
      key: 'settings',
      kind: 'link',
      href: '/settings',
      onSelect: () => setOpen(false),
    },
    {
      key: 'signout',
      kind: 'button',
      onSelect: handleSignOut,
    },
  ];

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Open/close and roving keyboard navigation (ARIA menu pattern)
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    // Focus first item on open
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = itemRefs.current[activeIndex];
    if (target) target.focus();
  }, [activeIndex, open]);

  function handleTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % items.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + items.length) % items.length);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(items.length - 1);
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        onKeyDown={handleTriggerKey}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[var(--rail)] border border-[var(--rail-light)] hover:border-[#3a3d4a] transition-colors cursor-pointer"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
      >
        <div
          className={`w-7 h-7 rounded-full ${color} text-[var(--text)] text-xs font-semibold flex items-center justify-center flex-shrink-0`}
        >
          {initials}
        </div>
        <span className="hidden md:inline text-xs text-[var(--text-muted)] max-w-[140px] truncate">
          {user.name || user.email}
        </span>
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={12}
          className={`hidden md:block text-[var(--text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          aria-activedescendant={
            activeIndex >= 0 ? `${menuId}-item-${items[activeIndex].key}` : undefined
          }
          onKeyDown={handleMenuKey}
          className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl shadow-xl shadow-black/40 z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-[var(--rail)]">
            <p className="text-sm font-medium text-[var(--text)] truncate">{user.name || 'Your account'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1" role="none">
            <Link
              href="/settings"
              id={`${menuId}-item-settings`}
              role="menuitem"
              tabIndex={activeIndex === 0 ? 0 : -1}
              ref={el => {
                itemRefs.current[0] = el;
              }}
              onClick={() => setOpen(false)}
              onFocus={() => setActiveIndex(0)}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--rail)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Settings02Icon} size={15} className="text-[var(--text-muted)]" />
              Account settings
            </Link>

            <button
              type="button"
              id={`${menuId}-item-signout`}
              role="menuitem"
              tabIndex={activeIndex === 1 ? 0 : -1}
              ref={el => {
                itemRefs.current[1] = el;
              }}
              onClick={handleSignOut}
              onFocus={() => setActiveIndex(1)}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--rail)] hover:text-[var(--danger)] transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Logout01Icon} size={15} className="text-[var(--danger)]" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}