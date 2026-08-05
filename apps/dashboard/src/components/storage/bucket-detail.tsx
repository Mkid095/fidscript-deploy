'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Banner } from './banner';
import { BucketBody } from './bucket-body';
import { NewFolderModal } from './new-folder-modal';
import { UploadFilesModal } from './upload-files-modal';
import { useBucketFileActions } from './use-bucket-file-actions';
import { useUploadFiles } from './use-upload-files';
import { useBucketRealtime } from './use-bucket-realtime';
import { useFilePreview } from './use-file-preview';
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

  const cachePreviewUrl = useCallback((fileId: string, url: string) => {
    setPreviewUrls(prev => ({ ...prev, [fileId]: url }));
  }, []);

  const preview = useFilePreview({ projectId, bucketId, getSdk, onPreviewUrlCached: cachePreviewUrl });

  const handleFileUploaded = useCallback((file: StorageFile) => {
    setFiles(prev => prev.find(f => f.id === file.id) ? prev : [file, ...prev]);
  }, []);

  const handleFileDeleted = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setPreviewUrls(prev => {
      const { [fileId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  useBucketRealtime({
    projectId, bucketId, getSdk, getToken,
    onFileUploaded: handleFileUploaded,
    onFileDeleted: handleFileDeleted,
  });

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
        previewFile={preview.file} previewUrl={preview.url}
        previewLoading={preview.loading} deletingId={null}
        dropRef={dropRef}
        onViewModeChange={setViewMode}
        onNewFolder={navigateToFolder}
        onOpenNewFolderModal={() => setShowNewFolderModal(true)}
        onUploadInputChange={() => setShowUploadModal(true)}
        onPreview={preview.open}
        onCopyUrl={handleCopyUrl}
        onDelete={handleDelete}
        onDrop={handleDrop}
        onPreviewClose={preview.close}
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