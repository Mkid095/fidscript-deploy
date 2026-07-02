'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Banner } from './banner';
import { BucketBody } from './bucket-body';
import { NewFolderModal } from './new-folder-modal';
import { UploadFilesModal } from './upload-files-modal';
import { useBucketFileActions } from './use-bucket-file-actions';
import { useUploadFiles } from './use-upload-files';
import type { StorageFile } from '@/types';

type ViewMode = 'list' | 'grid';

interface BucketDetailProps {
  projectId: string;
  bucketId: string;
}

export function BucketDetail({ projectId, bucketId }: BucketDetailProps) {
  const { getSdk, getToken } = useAuth();

  const [files, setFiles] = useState<StorageFile[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [prefix, setPrefix] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const showBanner = useCallback((message: string, type: 'success' | 'error') => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSdk().storage.listFiles(projectId, bucketId, {
        prefix: prefix || undefined,
        limit: 50,
      });
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, bucketId, getSdk, prefix]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    async function setup() {
      try {
        const token = getToken();
        if (!token) return;
        const rt = getSdk().realtime;
        await rt.connect(token);
        unsub = rt.subscribeStorage(projectId, (event) => {
          if (event.type === 'storage.file.uploaded') {
            const p = event.metadata as { bucketId: string; file: StorageFile };
            if (p.bucketId === bucketId) setFiles(prev => prev.find(f => f.id === p.file.id) ? prev : [p.file, ...prev]);
          } else if (event.type === 'storage.file.deleted') {
            const p = event.metadata as { bucketId: string; fileId: string };
            if (p.bucketId === bucketId) setFiles(prev => prev.filter(f => f.id !== p.fileId));
          }
        });
      } catch { /* realtime optional */ }
    }
    setup();
    return () => { unsub?.(); };
  }, [projectId, bucketId, getSdk, getToken]);

  const { handleDelete, handleCopyUrl } = useBucketFileActions({
    projectId, bucketId, prefix, getSdk, onFilesChange: setFiles, onBanner: showBanner,
  });

  const { uploadFiles } = useUploadFiles({
    projectId, bucketId, prefix, getSdk, onFilesChange: setFiles, onBanner: showBanner,
  });

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await uploadFiles(Array.from(e.dataTransfer.files));
  }, [uploadFiles]);

  const handlePreview = useCallback(async (file: StorageFile) => {
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const url = await getSdk().storage.getSignedUrl(projectId, bucketId, file.id);
      setPreviewUrl(url);
      if (file.mimeType?.startsWith('image/')) {
        setPreviewUrls(prev => ({ ...prev, [file.id]: url }));
      }
    } catch { setPreviewUrl(null); }
    finally { setPreviewLoading(false); }
  }, [projectId, bucketId, getSdk]);

  const navigateToFolder = useCallback((folderPrefix: string) => {
    setPrefix(folderPrefix);
  }, []);

  return (
    <>
      {banner && <Banner message={banner.message} type={banner.type} />}
      <BucketBody
        projectId={projectId} bucketId={bucketId}
        files={files} previewUrls={previewUrls} loading={loading}
        error={error} viewMode={viewMode}
        prefix={prefix} dragging={dragging}
        previewFile={previewFile} previewUrl={previewUrl}
        previewLoading={previewLoading} deletingId={null}
        dropRef={dropRef}
        onViewModeChange={setViewMode}
        onNewFolder={navigateToFolder}
        onOpenNewFolderModal={() => setShowNewFolderModal(true)}
        onUploadInputChange={() => setShowUploadModal(true)}
        onPreview={handlePreview}
        onCopyUrl={handleCopyUrl}
        onDelete={handleDelete}
        onDrop={handleDrop}
        onPreviewClose={() => { setPreviewFile(null); setPreviewUrl(null); }}
      />

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        currentPrefix={prefix}
        onCreated={(newPrefix) => {
          navigateToFolder(newPrefix);
          showBanner(`Folder created`, 'success');
        }}
      />

      <UploadFilesModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        projectId={projectId}
        bucketId={bucketId}
        prefix={prefix}
        getSdk={getSdk}
        onFilesChange={setFiles}
        onBanner={showBanner}
      />
    </>
  );
}
