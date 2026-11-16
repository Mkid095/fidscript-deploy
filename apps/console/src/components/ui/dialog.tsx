'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';

/**
 * A dialog.
 *
 * One primitive, so every panel that opens over the page behaves the same
 * way: it sits on a dimmed page, closes on Escape or on the dimmed ground,
 * holds the page still while it is open, and carries its title, its body
 * and its actions in the same places.
 *
 * It is **ported to the document's body** and floats centred over
 * everything — the sticky header included. A dialog that renders where it
 * is declared inherits whatever its ancestors do to positioning, and ends
 * up fitted inside a bar it was meant to cover.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** For panels that genuinely need the room — a wizard, a form with columns. */
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`my-auto w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-full overflow-y-auto rounded-xl border border-rail bg-surface shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-rail bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-text">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm leading-relaxed text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <svg
              aria-hidden
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-rail bg-surface px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * The danger-flavoured confirm — a delete, a disconnect — with the thing
 * that will be affected named in the body, and the destructive action on
 * the right where the eye lands last.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  pending = false,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  pending?: boolean;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-text-muted">{body}</p>
    </Dialog>
  );
}
