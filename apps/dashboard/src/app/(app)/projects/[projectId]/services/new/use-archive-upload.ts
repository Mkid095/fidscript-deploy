// useArchiveUpload — hook for archive file upload logic

import { useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Project } from '@/types';
import { uploadArchive as storeArchive } from '@/lib/archive-upload';
import { formatBytes } from '@/lib/format';

interface UseArchiveUploadOptions {
  project: Project;
  getSdk: () => FidscriptSDK;
  onShowToast: (opts: { type: string; message: string }) => void;
}

export function useArchiveUpload({ project, getSdk, onShowToast }: UseArchiveUploadOptions) {
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [uploadingArchive, setUploadingArchive] = useState(false);
  const [uploadedArchive, setUploadedArchive] = useState<{ bucketId: string; objectKey: string } | null>(null);

  const uploadArchive = useCallback(async (file: File) => {
    setArchiveFile(file);
    setUploadingArchive(true);
    setUploadedArchive(null);
    try {
      const uploaded = await storeArchive(getSdk(), project.id, file);
      setUploadedArchive(uploaded);
      onShowToast({ type: 'success', message: `Uploaded ${file.name} (${formatBytes(file.size)})` });
    } catch (err) {
      onShowToast({ type: 'error', message: err instanceof Error ? err.message : 'Archive upload failed' });
      setArchiveFile(null);
    } finally {
      setUploadingArchive(false);
    }
  }, [project.id, getSdk, onShowToast]);

  const replaceArchive = useCallback(() => {
    setArchiveFile(null);
    setUploadedArchive(null);
  }, []);

  return { archiveFile, uploadingArchive, uploadedArchive, uploadArchive, replaceArchive, setArchiveFile };
}
