'use client';

import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload01Icon } from '@hugeicons/core-free-icons';
import { Modal, Button } from '@fidscript/ui';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';
import { UploadFileRow } from './upload-file-row';
import { useModalUpload } from './use-modal-upload';

interface UploadFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  bucketId: string;
  prefix: string;
  getSdk: () => FidscriptSDK;
  onFilesChange: (files: StorageFile[] | ((prev: StorageFile[]) => StorageFile[])) => void;
  onBanner: (message: string, type: 'success' | 'error') => void;
}

export function UploadFilesModal({
  isOpen, onClose, projectId, bucketId, prefix, getSdk, onFilesChange, onBanner,
}: UploadFilesModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { items, addFiles, removeFile, clearDone, reset, uploadAll } = useModalUpload({
    projectId, bucketId, prefix, getSdk, onFilesChange, onBanner,
  });

  const handleClose = () => { reset(); onClose(); };

  const pendingCount = items.filter(f => f.status === 'pending').length;
  const allDone = items.length > 0 && items.every(f => f.status === 'done' || f.status === 'error');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Files" size="lg">
      <div className="space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragging
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--rail)] hover:border-[var(--text-dim)] bg-[var(--surface-2)]'
            }
          `}
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
          <HugeiconsIcon icon={Upload01Icon} size={32} className="text-[var(--text-dim)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text)] font-medium">
            Drop files here or <span className="text-[var(--accent)]">browse</span>
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-1">Any file type • Max 5 GB per file</p>
        </div>

        {items.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item, i) => (
              <UploadFileRow key={i} item={item} onRemove={() => removeFile(i)} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            {items.length > 0 && (
              <button onClick={clearDone} className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                Clear completed
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
            {pendingCount > 0 && (
              <Button variant="primary" size="sm" onClick={uploadAll} className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
                <HugeiconsIcon icon={Upload01Icon} size={13} className="mr-1.5" />
                Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
              </Button>
            )}
            {allDone && (
              <Button variant="primary" size="sm" onClick={handleClose} className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
