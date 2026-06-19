'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import { Toast } from '@fidscript/ui';

interface StorageFile {
  id: string;
  key: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  etag: string;
  createdAt: string;
}

function getSdk() {
  const token = localStorage.getItem('fidscript_token');
  if (!token) throw new Error('Not authenticated');
  return createFidscript({ apiKey: token });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface PageProps {
  params: Promise<{ bucket: string }>;
}

export default function BucketDetailPage({ params }: PageProps) {
  const { bucket: bucketId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? '';

  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadFiles = useCallback(async () => {
    if (!projectId || !bucketId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const data = await sdk.storage.listFiles(projectId, bucketId);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, bucketId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !bucketId) return;
    setUploading(true);
    setToast(null);
    try {
      const sdk = getSdk();
      const uploaded = await sdk.storage.uploadFile(projectId, bucketId, file, file.name, {
        contentType: file.type || 'application/octet-stream',
      });
      setFiles(prev => [uploaded, ...prev]);
      setToast({ message: `Uploaded "${file.name}"`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [projectId, bucketId]);

  const handleDelete = useCallback(async (fileId: string, fileName: string) => {
    if (!projectId || !bucketId) return;
    setDeletingId(fileId);
    setToast(null);
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
  }, [projectId, bucketId]);

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
  }, [projectId, bucketId]);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/storage" className="hover:text-slate-300">Storage</Link>
        <span>&rsaquo;</span>
        <span className="text-slate-200">{bucketId}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">{bucketId}</h1>
          <p className="text-sm text-slate-500">
            {files.length} object{files.length !== 1 ? 's' : ''}
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button
            variant="primary"
            size="sm"
            loading={uploading}
            disabled={uploading}
            onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </label>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          title="Bucket is empty"
          description="Upload your first file to get started."
        />
      ) : (
        <Card className="border border-[#1e2130]" padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Size</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Modified</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                  <td className="px-4 py-3">
                    <span className="text-slate-200 font-medium">{file.originalName ?? file.key}</span>
                    <p className="text-xs text-slate-500 md:hidden">{formatBytes(file.sizeBytes)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {formatBytes(file.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                    {new Date(file.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
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
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
