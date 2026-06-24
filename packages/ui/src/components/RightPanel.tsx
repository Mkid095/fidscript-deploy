import React, { useEffect, useRef } from 'react';

interface RightPanelFormFooter {
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  submitDanger?: boolean;
  hideCancel?: boolean;
}

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /**
   * Optional footer. Pass a RightPanelFormFooter to render the standard Submit + Cancel buttons.
   * Pass ReactNode for a custom footer. Omit to render no footer.
   * ponytail: most panels are either destructive confirmations (single button) or form editors (two buttons) —
   * the common shape is one footer config, not a per-panel bespoke footer.
   */
  footer?: RightPanelFormFooter | React.ReactNode;
  /** Optional width override; default is `md` (~480px). */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Slide-in panel from the right edge. Per ADR-036 principle 12 — replaces modal
 * patterns for create/edit/delete flows so the underlying list stays in context.
 * Closes on Escape, on backdrop click, and on the X button. Locks body scroll while open.
 */
export function RightPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: RightPanelProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    lastFocusRef.current = document.activeElement as HTMLElement | null;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element in the panel for keyboard users.
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([aria-label="Close panel"]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      // Restore focus to whatever was focused before the panel opened.
      lastFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Form footer discriminated by submitLabel — the field exists only on RightPanelFormFooter,
  // never on ReactNode (which is always an object too, but never has submitLabel).
  const formFooter: RightPanelFormFooter | null =
    footer && typeof footer === 'object' && !React.isValidElement(footer) && 'submitLabel' in (footer as RightPanelFormFooter)
      ? (footer as RightPanelFormFooter)
      : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'right-panel-title' : undefined}
    >
      <div
        ref={panelRef}
        className={`w-full ${sizeClasses[size]} h-full bg-[#0f1217] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-200 ease-out translate-x-0`}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id="right-panel-title" className="text-base font-semibold text-white truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="text-slate-400 hover:text-white transition flex-shrink-0 p-1 -m-1 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body — overflow-y-auto so long content scrolls; padded so the footer never crowds the body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {formFooter ? (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-800 flex-shrink-0">
            {!formFooter.hideCancel && (
              <button
                type="button"
                onClick={formFooter.onCancel}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition rounded-md hover:bg-slate-800"
              >
                {formFooter.cancelLabel ?? 'Cancel'}
              </button>
            )}
            <button
              type={formFooter.onSubmit ? 'button' : 'submit'}
              onClick={formFooter.onSubmit}
              disabled={formFooter.loading || formFooter.submitDisabled}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
                formFooter.submitDanger
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-orange-500 text-white hover:bg-orange-400'
              }`}
            >
              {formFooter.loading ? 'Working…' : (formFooter.submitLabel ?? 'Submit')}
            </button>
          </div>
        ) : footer ? (
          <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0">{footer as React.ReactNode}</div>
        ) : null}
      </div>
    </div>
  );
}
