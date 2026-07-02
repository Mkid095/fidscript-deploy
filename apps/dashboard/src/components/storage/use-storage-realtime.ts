'use client';

import { useEffect, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript/sdk';

// Local alias — mirrors @fidscript/events PlatformEvent
type PlatformEvent = { type: string; metadata: Record<string, unknown> };
import type { StorageFile } from '@/types';
import type { Bucket } from './bucket';

type BucketHandler = (bucket: Bucket) => void;
type BucketDeleteHandler = (bucketId: string) => void;
type FileHandler = (file: StorageFile) => void;
type FileDeleteHandler = (bucketId: string, fileId: string) => void;

export function useStorageRealtime(
  getSdk: () => FidscriptSDK,
  getToken: () => string | null,
  projectId: string,
  handlers: {
    onBucketCreated?: BucketHandler;
    onBucketDeleted?: BucketDeleteHandler;
    onFileUploaded?: FileHandler;
    onFileDeleted?: FileDeleteHandler;
  },
) {
  const rtRef = useRef<(() => void) | undefined>(undefined);

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
          if (event.type === 'storage.bucket.created') {
            const payload = event.metadata as { bucket: Bucket };
            handlers.onBucketCreated?.(payload.bucket);
          } else if (event.type === 'storage.bucket.deleted') {
            const payload = event.metadata as { bucketId: string };
            handlers.onBucketDeleted?.(payload.bucketId);
          } else if (event.type === 'storage.file.uploaded') {
            const payload = event.metadata as { bucketId: string; file: StorageFile };
            handlers.onFileUploaded?.(payload.file);
          } else if (event.type === 'storage.file.deleted') {
            const payload = event.metadata as { bucketId: string; fileId: string };
            handlers.onFileDeleted?.(payload.bucketId, payload.fileId);
          }
        });
        rtRef.current = unsub;
      } catch { /* realtime optional */ }
    }

    setup();
    return () => { unsub?.(); };
  }, [projectId, getSdk, getToken, handlers]);
}
