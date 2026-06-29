'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Spinner, EmptyState, Toast } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Upload02Icon,
  FolderAddIcon,
  ImageIcon,
  File01Icon,
  Delete01Icon,
  Settings01Icon,
  ChevronRightIcon,
  CancelCircleIcon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';

interface StorageFile {
  id: string;
  key: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  etag: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImage(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

interface PageProps {
  params: Promise<{ bucket: string }>;
}

const PAGE_SIZE = 50;

export default function BucketDetailPage({ params }: PageProps) {
  const { bucket: bucketId } = use(params);
  const { getSdk, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? '';

  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Folder navigation
  const [prefix, setPrefix] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 1;

  // Drag-and-drop
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // File preview modal
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);

  const pathParts = prefix ? prefix.split('/').filter(Boolean) : [];

  const loadFiles = useCallback(async () => {
    if (!projectId || !bucketId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const data = await sdk.storage.listFiles(projectId, bucketId, {
        prefix: prefix || undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, bucketId, getSdk, prefix, currentPage]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;
    let rtRef: (() => void) | null = null;
    async function setup() {
      try {
        const sdk = getSdk();
        const token = getToken();
        if (!token) return;
        const rt = sdk.realtime;
        await rt.connect(token);
        rtRef = rt.subscribeStorage(projectId, (event) => {
          if (event.type === 'storage.file.uploaded') {
            const payload = event.metadata as { bucketId: string; file: StorageFile };
            if (payload.bucketId === bucketId) {
              setFiles(prev => {
                if (prev.find(f => f.id === payload.file.id)) return prev;
                return [payload.file, ...prev];
              });
            }
          } else if (event.type === 'storage.file.deleted') {
            const payload = event.metadata as { bucketId: string; fileId: string };
            if (payload.bucketId === bucketId) {
              setFiles(prev => prev.filter(f => f.id !== payload.fileId));
            }
          }
        });
      } catch { /* realtime optional */ }
    }
    setup();
    return () => { rtRef?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, bucketId]);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length || !projectId || !bucketId) return;

    setUploading(true);
    let success = 0; let failed = 0;
    for (const file of dropped) {
      try {
        const sdk = getSdk();
        const uploaded = await sdk.storage.uploadFile(projectId, bucketId, file, file.name, {
          contentType: file.type || 'application/octet-stream',
          key: prefix ? `${prefix}${file.name}` : file.name,
        });
        setFiles(prev => {
          if (prev.find(f => f.id === uploaded.id)) return prev;
          return [uploaded, ...prev];
        });
        success++;
      } catch { failed++; }
    }
    setUploading(false);
    setToast({
      message: failed === 0
        ? `Uploaded ${success} file${success !== 1 ? 's' : ''}`
        : `Uploaded ${success}, failed ${failed}`,
      type: failed === 0 ? 'success' : 'error',
    });
  }, [projectId, bucketId, getSdk, prefix]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length || !projectId || !bucketId) return;
    setUploading(true);
    let success = 0; let failed = 0;
    for (const file of Array.from(fileList)) {
      try {
        const sdk = getSdk();
        const uploaded = await sdk.storage.uploadFile(projectId, bucketId, file, file.name, {
          contentType: file.type || 'application/octet-stream',
          key: prefix ? `${prefix}${file.name}` : file.name,
        });
        setFiles(prev => {
          if (prev.find(f => f.id === uploaded.id)) return prev;
          return [uploaded, ...prev];
        });
        success++;
      } catch { failed++; }
    }
    setUploading(false);
    setToast({
      message: failed === 0
        ? `Uploaded ${success} file${success !== 1 ? 's' : ''}`
        : `Uploaded ${success}, failed ${failed}`,
      type: failed === 0 ? 'success' : 'error',
    });
    e.target.value = '';
  }, [projectId, bucketId, getSdk, prefix]);

  const handleDelete = useCallback(async (fileId: string, fileName: string) => {
    if (!projectId || !bucketId) return;
    if (!confirm(`Delete "${fileName}"?`)) return;
    setDeletingId(fileId);
    try {
      const sdk = getSdk();
      await sdk.storage.deleteFile(projectId, bucketId, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setToast({ message: `Deleted "${fileName}"`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  }, [projectId, bucketId, getSdk]);

  const handleCopyUrl = useCallback(async (fileId: string, fileName: string) => {
    if (!projectId || !bucketId) return;
    try {
      const sdk = getSdk();
      const url = await sdk.storage.getSignedUrl(projectId, bucketId, fileId);
      await navigator.clipboard.writeText(url);
      setToast({ message: `URL for "${fileName}" copied`, type: 'success' });
    } catch {
      setToast({ message: 'Failed to get URL', type: 'error' });
    }
  }, [projectId, bucketId, getSdk]);

  const handlePreview = useCallback(async (file: StorageFile) => {
    setPreviewFile(file);
    if (!projectId || !bucketId) return;
    try {
      const sdk = getSdk();
      const url = await sdk.storage.getSignedUrl(projectId, bucketId, file.id);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
    }
  }, [projectId, bucketId, getSdk]);

  const navigateToFolder = useCallback((folderPrefix: string) => {
    setPrefix(folderPrefix);
    setCurrentPage(1);
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  return (
    <div
      ref={dropRef}
      className="relative min-h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)] flex items-center justify-center pointer-events-none">
          <div className="bg-[var(--surface)] rounded-xl p-8 text-center border border-[var(--accent)]">
            <HugeiconsIcon icon={Upload02Icon} size={40} className="text-[var(--accent)] mx-auto mb-3" />
            <p className="text-[var(--text)] font-semibold">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-4 flex-wrap">
        <Link href="/storage" className="hover:text-[var(--text)] transition-colors flex items-center gap-1">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
          Storage
        </Link>
        <HugeiconsIcon icon={ChevronRightIcon} size={12} />
        <button
          onClick={() => navigateToFolder('')}
          className="hover:text-[var(--text)] transition-colors font-medium text-[var(--text)]"
        >
          {bucketId}
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <HugeiconsIcon icon={ChevronRightIcon} size={12} />
            <button
              onClick={() => navigateToFolder(pathParts.slice(0, i + 1).join('/') + '/')}
              className="hover:text-[var(--text)] transition-colors"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">{bucketId}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {files.length} object{files.length !== 1 ? 's' : ''}{prefix ? ` in ${prefix}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(s => !s)}>
            <HugeiconsIcon icon={Settings01Icon} size={14} className="mr-1.5" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const name = prompt('Folder name:');
              if (name?.trim()) {
                setPrefix(prev => (prev || '') + name.trim() + '/');
                setCurrentPage(1);
              }
            }}
          >
            <HugeiconsIcon icon={FolderAddIcon} size={14} className="mr-1.5" />
            New Folder
          </Button>
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="primary" size="sm" loading={uploading} disabled={uploading}>
              <HugeiconsIcon icon={Upload02Icon} size={14} className="mr-1.5" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </label>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Card className="border border-[var(--accent)]/30 bg-[var(--accent)]/5 mb-6" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Bucket Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-[var(--text-dim)] hover:text-[var(--text)]">
              <HugeiconsIcon icon={CancelCircleIcon} size={16} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!confirm(`Delete bucket "${bucketId}" and ALL its files? This cannot be undone.`)) return;
                const sdk = getSdk();
                sdk.storage.deleteBucket(projectId, bucketId).then(() => {
                  router.push('/storage');
                }).catch(err => showToast(err instanceof Error ? err.message : 'Delete failed', 'error'));
              }}
            >
              <HugeiconsIcon icon={Delete01Icon} size={14} className="mr-1.5" />
              Delete Bucket
            </Button>
            <p className="text-xs text-[var(--text-muted)]">
              This will permanently delete the bucket and all uploaded files.
            </p>
          </div>
        </Card>
      )}

      {error && (
        <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          title={prefix ? 'Folder is empty' : 'Bucket is empty'}
          description={prefix ? 'Upload files to this folder.' : 'Upload your first file to get started.'}
        />
      ) : (
        <>
          <Card className="border border-[var(--rail)]" padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--rail)]">
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Name</th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden md:table-cell">Size</th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden lg:table-cell">Modified</th>
                  <th className="text-right text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={isImage(file.mimeType) ? ImageIcon : File01Icon}
                          size={16}
                          className="text-[var(--text-dim)] flex-shrink-0"
                        />
                        <div>
                          <button
                            onClick={() => isImage(file.mimeType) ? handlePreview(file) : null}
                            className={`text-[var(--text)] font-medium hover:underline ${isImage(file.mimeType) ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            {file.originalName ?? file.key}
                          </button>
                          <p className="text-xs text-[var(--text-muted)] md:hidden">{formatBytes(file.sizeBytes)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] hidden lg:table-cell">
                      {new Date(file.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isImage(file.mimeType) && (
                          <Button variant="ghost" size="sm" onClick={() => handlePreview(file)}>
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyUrl(file.id, file.originalName ?? file.key)}
                        >
                          Copy URL
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deletingId === file.id}
                          onClick={() => handleDelete(file.id, file.originalName ?? file.key)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[var(--text-muted)]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* File preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8"
          onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
        >
          <div className="bg-[var(--surface)] rounded-xl max-w-4xl w-full max-h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--rail)]">
              <h3 className="text-sm font-semibold text-[var(--text)]">{previewFile.originalName ?? previewFile.key}</h3>
              <button onClick={() => { setPreviewFile(null); setPreviewUrl(null); }} className="text-[var(--text-dim)] hover:text-[var(--text)]">
                <HugeiconsIcon icon={CancelCircleIcon} size={18} />
              </button>
            </div>
            <div className="p-4">
              {previewUrl && isImage(previewFile.mimeType) ? (
                <img src={previewUrl} alt={previewFile.originalName ?? previewFile.key} className="max-w-full h-auto rounded-lg" />
              ) : (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <HugeiconsIcon icon={File01Icon} size={48} className="mx-auto mb-3 text-[var(--text-dim)]" />
                  <p>Preview not available for this file type.</p>
                </div>
              )}
              <div className="mt-4 text-xs text-[var(--text-muted)] space-y-1">
                <p>Size: {formatBytes(previewFile.sizeBytes)}</p>
                <p>Type: {previewFile.mimeType ?? 'unknown'}</p>
                <p>Key: {previewFile.key}</p>
                <p>Uploaded: {new Date(previewFile.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  );
}