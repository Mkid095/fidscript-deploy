// useArchiveUpload — hook for archive file upload logic

import { useState, useCallback } from 'react';
import type { Project } from '@/types';
import { API_BASE_URL } from '@/lib/sdk';
import { getAccessToken, formatBytes } from './new-deploy-utils';

interface UseArchiveUploadOptions {
  project: Project;
  onShowToast: (opts: { type: string; message: string }) => void;
}

export function useArchiveUpload({ project, onShowToast }: UseArchiveUploadOptions) {
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [uploadingArchive, setUploadingArchive] = useState(false);
  const [uploadedArchive, setUploadedArchive] = useState<{ bucketId: string; objectKey: string } | null>(null);

  const uploadArchive = useCallback(async (file: File) => {
    setArchiveFile(file);
    setUploadingArchive(true);
    setUploadedArchive(null);
    try {
      const token = getAccessToken();
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const objectKey = `deploys/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const bucketsRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets`, { headers: { Authorization: `Bearer ${token}` } });
      const bucketsData = await bucketsRes.json();
      let bucket = (bucketsData.buckets ?? []).find((b: { name: string }) => b.name === 'deploys');
      if (!bucket) {
        const createRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'deploys', provider: 'internal' }),
        });
        bucket = await createRes.json();
      }
      const uploadRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets/${bucket.id}/files`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, key: objectKey, originalName: file.name, mimeType: file.type || 'application/octet-stream' }),
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.message ?? `Upload failed (HTTP ${uploadRes.status})`);
      }
      setUploadedArchive({ bucketId: bucket.id, objectKey });
      onShowToast({ type: 'success', message: `Uploaded ${file.name} (${formatBytes(file.size)})` });
    } catch (err) {
      onShowToast({ type: 'error', message: err instanceof Error ? err.message : 'Archive upload failed' });
      setArchiveFile(null);
    } finally {
      setUploadingArchive(false);
    }
  }, [project.id, onShowToast]);

  const replaceArchive = useCallback(() => {
    setArchiveFile(null);
    setUploadedArchive(null);
  }, []);

  return { archiveFile, uploadingArchive, uploadedArchive, uploadArchive, replaceArchive, setArchiveFile };
}
