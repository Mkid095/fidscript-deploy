import React, { useCallback, useId, useRef, useState } from 'react';

/**
 * Dropzone — accessible drag-and-drop file input.
 *
 * Renders a dashed-border drop area with a hidden `<input type="file">`.
 * Supports click-to-browse, drag-and-drop, keyboard (Enter/Space) activation,
 * file-type and file-size validation, and multiple files.
 *
 * Props:
 *   - onFiles: called with the accepted files (already validated)
 *   - accept: comma-separated MIME types or extensions (e.g. ".zip,.tar.gz,application/zip")
 *   - multiple: allow more than one file
 *   - maxSizeBytes: reject files larger than this (per-file)
 *   - disabled: disable interaction
 *   - hint: optional helper text shown under the title
 *   - title: the main label (default "Drag and drop files here")
 *   - children: optional custom content rendered inside the drop area
 *
 * Validation errors are surfaced via `onError?.(message)`.
 */
interface DropzoneProps {
  onFiles: (files: File[]) => void;
  onError?: (message: string) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  disabled?: boolean;
  title?: string;
  hint?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Dropzone({
  onFiles,
  onError,
  accept,
  multiple = false,
  maxSizeBytes,
  disabled = false,
  title = 'Drag and drop files here',
  hint,
  className = '',
  children,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const validate = useCallback(
    (files: File[]): File[] => {
      const accepted: File[] = [];
      for (const file of files) {
        // Size check
        if (maxSizeBytes && file.size > maxSizeBytes) {
          const mb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
          onError?.(`"${file.name}" exceeds the ${mb} MB limit`);
          continue;
        }
        // Type/extension check
        if (accept) {
          const patterns = accept.split(',').map(p => p.trim().toLowerCase());
          const name = file.name.toLowerCase();
          const type = file.type.toLowerCase();
          const matched = patterns.some(p =>
            p.startsWith('.') ? name.endsWith(p) : type === p || type.startsWith(p.replace('/*', '/')),
          );
          if (!matched) {
            onError?.(`"${file.name}" is not an accepted file type`);
            continue;
          }
        }
        accepted.push(file);
      }
      return accepted;
    },
    [accept, maxSizeBytes, onError],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const all = Array.from(fileList);
      const valid = validate(all);
      if (valid.length > 0) onFiles(multiple ? valid : [valid[0]]);
    },
    [multiple, onFiles, validate],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-disabled={disabled}
        aria-label={title}
        className={`
          group flex flex-col items-center justify-center text-center cursor-pointer
          rounded-xl border-2 border-dashed transition-all duration-200
          px-6 py-10 outline-none
          ${disabled
            ? 'border-[#1e2130] bg-[#080a0d] opacity-60 cursor-not-allowed'
            : isDragging
              ? 'border-red-500 bg-red-500/5 ring-4 ring-red-500/10'
              : 'border-[#2a2d3a] bg-[#080a0d] hover:border-red-500/50 hover:bg-red-500/[0.02]'
          }
          focus-visible:ring-4 focus-visible:ring-red-500/20
        `}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={e => {
            handleFiles(e.target.files);
            // Reset so selecting the same file again re-fires onChange
            e.target.value = '';
          }}
        />
        {children ?? (
          <>
            <UploadIcon className={isDragging ? 'text-red-400' : 'text-slate-600'} />
            <p className={`mt-3 text-sm font-medium ${isDragging ? 'text-red-300' : 'text-slate-400'}`}>
              {title}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {hint ?? 'or click to browse'}
            </p>
          </>
        )}
      </label>
    </div>
  );
}

function UploadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-7 h-7 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}
