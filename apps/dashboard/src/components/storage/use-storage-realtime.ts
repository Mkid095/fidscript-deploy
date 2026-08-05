'use client';

import { useEffect, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';
import type { Bucket } from './bucket';

type BucketHandler = (bucket: Bucket) => void;
type BucketDeleteHandler = (bucketId: string) => void;
type FileHandler = (file: StorageFile) => void;
type FileDeleteHandler = (bucketId: string, fileId: string) => void;

export interface StorageRealtimeHandlers {
  onBucketCreated?: BucketHandler;
  onBucketDeleted?: BucketDeleteHandler;
  onFileUploaded?: FileHandler;
  onFileDeleted?: FileDeleteHandler;
}

export function useStorageRealtime(
  getSdk: () => FidscriptSDK,
  getToken: () => string | null,
  projectId: string,
  handlers: StorageRealtimeHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let unsub: (() => void) | undefined;

    async function setup() {
      try {
        const sdk = getSdk();
        const token = getToken();
        if (!token) return;
        const rt = sdk.realtime;
        await rt.connect(token);
        unsub = rt.subscribeStorage(projectId, (event) => {
          const h = handlersRef.current;
          if (event.type === 'storage.bucket.created') {
            const payload = event.metadata as { bucket: Bucket };
            h.onBucketCreated?.(payload.bucket);
          } else if (event.type === 'storage.bucket.deleted') {
            const payload = event.metadata as { bucketId: string };
            h.onBucketDeleted?.(payload.bucketId);
          } else if (event.type === 'storage.file.uploaded') {
            const payload = event.metadata as { bucketId: string; file: StorageFile };
            h.onFileUploaded?.(payload.file);
          } else if (event.type === 'storage.file.deleted') {
            const payload = event.metadata as { bucketId: string; fileId: string };
            h.onFileDeleted?.(payload.bucketId, payload.fileId);
          }
        });
      } catch { /* realtime optional */ }
    }

    setup();
    return () => { unsub?.(); };
  }, [projectId, getSdk, getToken]);
}