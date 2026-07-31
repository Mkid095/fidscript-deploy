'use client';

import type { StorageBackend } from '@fidscript-deploy/sdk';
import type { FidscriptSdk } from '@fidscript-deploy/sdk';

type SendMailOpts = {
  fromLocal?: string;
  to: string;
  subject: string;
  text: string;
  storageBackend: StorageBackend;
  attachments?: { filename: string; mimeType: string; data: string }[];
};

export async function sendPlatformMail(
  sdk: FidscriptSdk,
  opts: SendMailOpts,
  onSent: () => void,
  setSendResult: (msg: string) => void,
  setActiveFolder: (folder: string) => void,
) {
  await sdk.email.admin.sendMail(opts as Parameters<typeof sdk.email.admin.sendMail>[0]);
  setSendResult('Sent');
  setActiveFolder('sent');
  onSent();
}
