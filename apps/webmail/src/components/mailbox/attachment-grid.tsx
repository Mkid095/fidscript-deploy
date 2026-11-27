'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  X,
} from 'lucide-react';

import { fetchPart, partUrl } from '@/lib/mailbox/api';
import { formatBytes } from '@/lib/mailbox/format';

export interface PartRef {
  partId?: string;
  blobId: string;
  size: number;
  name: string | null;
  type: string;
  disposition: string | null;
  isAttachment: boolean;
  /** The id the parts route answers with: the JMAP part id, else the part's index. */
  partRef: string;
}

interface AttachmentGridProps {
  messageId: string;
  /** The message's attachment parts (the full list, already filtered). */
  parts: PartRef[];
}

type Kind = 'image' | 'pdf' | 'audio' | 'video' | 'other';

function kindOf(type: string): Kind {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  return 'other';
}

function TileIcon({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'video':
      return <Film className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

/** One tile: the kind's icon, the name, the size; a click opens the preview. */
function Tile({
  messageId,
  part,
  onPreview,
}: {
  messageId: string;
  part: PartRef;
  onPreview: (part: PartRef) => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const kind = kindOf(part.type);

  // Images earn a real thumbnail; the rest wear their icon.
  useEffect(() => {
    if (kind !== 'image') return;
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchPart(messageId, part.partRef)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setThumb(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, part.partRef, kind]);

  return (
    <button
      type="button"
      onClick={() => onPreview(part)}
      className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-orange-500"
      title={`Preview ${part.name ?? 'attachment'}`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={part.name ?? 'attachment'}
          className="h-14 w-14 rounded object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <TileIcon kind={kind} />
        </span>
      )}
      <span className="w-full truncate text-center text-[11px] font-medium text-slate-700 dark:text-slate-300">
        {part.name ?? 'Attachment'}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
        {formatBytes(part.size)}
      </span>
    </button>
  );
}

/**
 * The message's attachment tiles, and the full-size preview that a tile
 * opens. The bytes come from the parts route as a blob URL, so the same
 * tile previews and plays images, PDFs, audio and video, and offers a
 * plain download for everything else.
 */
export function AttachmentGrid({ messageId, parts }: AttachmentGridProps) {
  const [preview, setPreview] = useState<PartRef | null>(null);

  if (parts.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {parts.map((part) => (
          <Tile
            key={part.partRef}
            messageId={messageId}
            part={part}
            onPreview={setPreview}
          />
        ))}
      </div>

      {preview && (
        <AttachmentPreview
          messageId={messageId}
          part={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

function AttachmentPreview({
  messageId,
  part,
  onClose,
}: {
  messageId: string;
  part: PartRef;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const kind = kindOf(part.type);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    fetchPart(messageId, part.partRef)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, part.partRef]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${part.name ?? 'attachment'}`}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {part.name ?? 'Attachment'}
            </div>
            <div className="font-mono text-[11px] tabular-nums text-slate-400">
              {part.type} · {formatBytes(part.size)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={partUrl(messageId, part.partRef)}
              download={part.name ?? undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-slate-50 p-4 dark:bg-slate-950">
          {failed ? (
            <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
              The attachment could not be read. Use Download instead.
            </div>
          ) : src === null ? (
            <div className="text-xs text-slate-400">Opening…</div>
          ) : kind === 'image' ? (
            <img
              src={src}
              alt={part.name ?? 'attachment'}
              className="max-h-[60vh] max-w-full rounded object-contain"
            />
          ) : kind === 'pdf' ? (
            <iframe src={src} title={part.name ?? 'PDF'} className="h-[60vh] w-full rounded border-0" />
          ) : kind === 'audio' ? (
            <audio src={src} controls className="w-full" />
          ) : kind === 'video' ? (
            <video src={src} controls className="max-h-[60vh] w-full rounded" />
          ) : (
            <div className="max-w-sm text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <TileIcon kind="other" />
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No live preview for this file type. The Download button fetches the bytes directly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
