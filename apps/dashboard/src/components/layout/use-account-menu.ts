'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * The account menu's behaviour — open state, roving focus, keyboard.
 *
 * The ARIA menu pattern: the menu opens on Enter, Space or ArrowDown, the
 * focus moves with the arrow keys, Home and End jump to the ends, Escape
 * closes it and returns the focus to the button that opened it.
 */
export function useAccountMenu(itemCount: number) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const menuId = useId();

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

  // Focus the first item when the menu opens
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
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
      setActiveIndex(i => (i + 1) % itemCount);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + itemCount) % itemCount);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(itemCount - 1);
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
  }

  return {
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    menuRef,
    triggerRef,
    itemRefs,
    menuId,
    handleTriggerKey,
    handleMenuKey,
  };
}
