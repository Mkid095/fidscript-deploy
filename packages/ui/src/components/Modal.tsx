import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** The text under the title — what the dialog is for. */
  description?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

/**
 * A dialog.
 *
 * It used to be a `div` with a `div` on top of it: no `role="dialog"`, no
 * `aria-modal`, no name, **no focus trap** — the tab key walked out of the
 * dialog into the page behind it — and nothing put the focus back where it
 * was when the dialog closed. Sixteen other dialogs hand-rolled the same
 * overlay with the same gaps.
 *
 * This one is a dialog: it is named, it is modal, the focus stays inside it
 * while it is open, it comes back to the control that opened it, and Escape
 * closes it.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`);
  const descriptionId = useRef(`modal-description-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // The focus goes inside the dialog — to its first control, so a person
    // typing can begin.
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? dialogRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      // The focus stays inside the dialog.
      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(
        // `offsetParent` is null for **every** element in a test DOM (there
        // is no layout), so the hidden check is made on the attributes.
        (element) =>
          !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      // The focus goes back where it came from.
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--canvas)]/60 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        aria-describedby={description ? descriptionId.current : undefined}
        tabIndex={-1}
        className={`w-full ${sizeClasses[size]} bg-[var(--surface)] border border-[var(--rail)] rounded-lg shadow-[var(--elevation-lg)] focus:outline-none`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-[var(--rail)]">
            <div className="min-w-0">
              <h2 id={titleId.current} className="text-sm font-semibold text-[var(--text)]">
                {title}
              </h2>
              {description && (
                <p id={descriptionId.current} className="text-xs text-[var(--text-muted)] mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition focus:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
