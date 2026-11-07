'use client';

import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronDownIcon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { AccountMenuHeader } from './account-menu-header';
import { AccountMenuDetails } from './account-menu-details';
import { AccountMenuItems } from './account-menu-items';
import { useAccountMenu } from './use-account-menu';

function getInitials(name?: string, email?: string): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return '?';
}

function getAvatarColor(name?: string): string {
  const colors = [
    'bg-[var(--warning)]',
    'bg-[var(--danger)]',
    'bg-[var(--brand)]',
    'bg-[var(--accent)]',
    'bg-[var(--info)]',
    'bg-[var(--success)]',
  ];
  const idx = (name ?? 'x').charCodeAt(0) % colors.length;
  return colors[idx];
}

/**
 * The account menu.
 *
 * It answers "who am I, and what can I do here" without leaving the page:
 * the person, their role, how they sign in, and the places they are most
 * likely to be going next.
 */
export function AvatarDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const menu = useAccountMenu(4);
  const initials = getInitials(user?.name, user?.email);
  const color = getAvatarColor(user?.name);

  async function handleSignOut() {
    menu.setOpen(false);
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <div className="relative" ref={menu.menuRef}>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => menu.setOpen(v => !v)}
        onKeyDown={menu.handleTriggerKey}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[var(--rail)] border border-[var(--rail-light)] hover:border-[#3a3d4a] transition-colors cursor-pointer"
        aria-label="Account menu"
        aria-expanded={menu.open}
        aria-haspopup="menu"
        aria-controls={menu.open ? menu.menuId : undefined}
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
          className={`hidden md:block text-[var(--text-muted)] transition-transform duration-150 ${menu.open ? 'rotate-180' : ''}`}
        />
      </button>

      {menu.open && (
        <div
          id={menu.menuId}
          role="menu"
          aria-label="Account menu"
          aria-activedescendant={
            menu.activeIndex >= 0 ? `${menu.menuId}-item-${menu.activeIndex}` : undefined
          }
          onKeyDown={menu.handleMenuKey}
          className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl shadow-xl shadow-black/40 z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <AccountMenuHeader user={user} initials={initials} color={color} />
          <AccountMenuDetails user={user} />
          <AccountMenuItems
            menuId={menu.menuId}
            activeIndex={menu.activeIndex}
            itemRefs={menu.itemRefs}
            onActiveIndexChange={menu.setActiveIndex}
            onClose={() => menu.setOpen(false)}
            onSignOut={handleSignOut}
          />
        </div>
      )}
    </div>
  );
}
