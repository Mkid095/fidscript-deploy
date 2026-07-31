'use client';

import { useCallback, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Modal, Button } from '@fidscript/ui';
import type { StorageFile } from '@/types';

interface UploadFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  bucketId: string;
  prefix: string;
  getSdk: () => { storage: { uploadFile: Function } };
  onFilesChange: (files: StorageFile[] | ((prev: StorageFile[]) => StorageFile[])) => void;
  onBanner: (message: string, type: 'success' | 'error') => void;
}

interface FileItem {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export function UploadFilesModal({
  isOpen, onClose, projectId, bucketId, prefix, getSdk, onFilesChange, onBanner,
}: UploadFilesModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const items: FileItem[] = Array.from(newFiles).map(file => ({
      file,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...items]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearDone = () => {
    setFiles(prev => prev.filter(f => f.status !== 'done'));
  };

  const handleUpload = async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) return;

    // Mark all pending as uploading
    setFiles(prev => prev.map(f =>
      f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
    ));

    let ok = 0; let fail = 0;
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status !== 'pending') continue;
      try {
        const uploaded = await getSdk().storage.uploadFile(projectId, bucketId, item.file, item.file.name, {
          contentType: item.file.type || 'application/octet-stream',
          key: prefix ? `${prefix}${item.file.name}` : item.file.name,
        });
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'done' as const } : f
        ));
        onFilesChange((prev: StorageFile[]) =>
          prev.find((f: StorageFile) => f.id === uploaded.id) ? prev : [uploaded, ...prev]
        );
        ok++;
      } catch (err) {
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error' as const, error: (err as Error).message } : f
        ));
        fail++;
      }
    }

    onBanner(
      fail === 0 ? `Uploaded ${ok} file${ok !== 1 ? 's' : ''}` : `Uploaded ${ok}, ${fail} failed`,
      fail === 0 ? 'success' : 'error',
    );
  };

  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');
  const hasPending = files.some(f => f.status === 'pending');

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Files" size="lg">
      <div className="space-y-4">
        {/* Dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragging
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--rail)] hover:border-[var(--text-dim)] bg-[var(--surface-2)]'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <Icon icon="icons8:upload" width={32} height={32} className="text-[var(--text-dim)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text)] font-medium">
            Drop files here or <span className="text-[var(--accent)]">browse</span>
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Any file type • Max 5 GB per file
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)]">
                <Icon
                  icon={
                    item.file.type.startsWith('image/') ? 'icons8:image-file' :
                    item.file.type.startsWith('video/') ? 'icons8:video-file' :
                    item.file.type.startsWith('audio/') ? 'icons8:music' :
                    item.file.type === 'application/pdf' ? 'icons8:pdf' :
                    'icons8:file'
                  }
                  width={16} height={16}
                  className="text-[var(--text-dim)] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text)] truncate">{item.file.name}</p>
                  <p className="text-[10px] text-[var(--text-dim)]">
                    {(item.file.size / 1024).toFixed(1)} KB
                    {item.error && <span className="text-rose-400 ml-2">{item.error}</span>}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {item.status === 'pending' && (
                    <button onClick={() => removeFile(i)} className="text-[var(--text-dim)] hover:text-rose-400 transition-colors">
                      <Icon icon="icons8:cancel" width={14} height={14} />
                    </button>
                  )}
                  {item.status === 'uploading' && (
                    <Icon icon="icons8:upload" width={14} height={14} className="text-[var(--accent)] animate-pulse" />
                  )}
                  {item.status === 'done' && (
                    <Icon icon="icons8:checkmark" width={14} height={14} className="text-emerald-400" />
                  )}
                  {item.status === 'error' && (
                    <Icon icon="icons8:cancel" width={14} height={14} className="text-rose-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {files.length > 0 && (
              <button
                onClick={clearDone}
                className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
            {hasPending && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpload}
                className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]"
              >
                <Icon icon="icons8:upload" width={13} height={13} className="mr-1.5" />
                Upload {files.filter(f => f.status === 'pending').length} file{files.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}
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
