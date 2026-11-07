'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings02Icon,
  Logout01Icon,
  Key01Icon,
  Book01Icon,
} from '@hugeicons/core-free-icons';

interface AccountMenuItemsProps {
  menuId: string;
  activeIndex: number;
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  onSignOut: () => void;
}

/**
 * The account menu's links.
 *
 * Every one of them leads somewhere that exists: the settings screen (with
 * the API keys section anchored), and the documentation that ships with the
 * platform.
 */
export function AccountMenuItems({
  menuId,
  activeIndex,
  itemRefs,
  onActiveIndexChange,
  onClose,
  onSignOut,
}: AccountMenuItemsProps) {
  const links = [
    { href: '/settings', label: 'Account settings', Icon: Settings02Icon },
    { href: '/settings#api-keys', label: 'API keys', Icon: Key01Icon },
    { href: '/docs', label: 'Documentation', Icon: Book01Icon },
  ];

  const itemClass =
    'flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--rail)] hover:text-[var(--text)] transition-colors cursor-pointer';

  return (
    <div className="py-1" role="none">
      {links.map(({ href, label, Icon }, index) => (
        <Link
          key={href}
          href={href}
          id={`${menuId}-item-${index}`}
          role="menuitem"
          tabIndex={activeIndex === index ? 0 : -1}
          ref={el => {
            itemRefs.current[index] = el;
          }}
          onClick={onClose}
          onFocus={() => onActiveIndexChange(index)}
          className={itemClass}
        >
          <HugeiconsIcon icon={Icon} size={15} className="text-[var(--text-muted)]" />
          {label}
        </Link>
      ))}

      <button
        type="button"
        id={`${menuId}-item-${links.length}`}
        role="menuitem"
        tabIndex={activeIndex === links.length ? 0 : -1}
        ref={el => {
          itemRefs.current[links.length] = el;
        }}
        onClick={onSignOut}
        onFocus={() => onActiveIndexChange(links.length)}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--rail)] hover:text-[var(--danger)] transition-colors cursor-pointer"
      >
        <HugeiconsIcon icon={Logout01Icon} size={15} className="text-[var(--danger)]" />
        Sign out
      </button>
    </div>
  );
}
