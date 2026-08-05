'use client';

import { useEffect } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';

interface UseBucketRealtimeOptions {
  projectId: string;
  bucketId: string;
  getSdk: () => FidscriptSDK;
  getToken: () => string | null;
  onFileUploaded: (file: StorageFile) => void;
  onFileDeleted: (fileId: string) => void;
}

export function useBucketRealtime({
  projectId, bucketId, getSdk, getToken, onFileUploaded, onFileDeleted,
}: UseBucketRealtimeOptions) {
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
            if (p.bucketId === bucketId) onFileUploaded(p.file);
          } else if (event.type === 'storage.file.deleted') {
            const p = event.metadata as { bucketId: string; fileId: string };
            if (p.bucketId === bucketId) onFileDeleted(p.fileId);
          }
        });
      } catch { /* realtime optional */ }
    }
    setup();
    return () => { unsub?.(); };
  }, [projectId, bucketId, getSdk, getToken, onFileUploaded, onFileDeleted]);
}