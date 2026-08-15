import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export type CatchAllTarget =
  | { type: 'mailbox'; mailboxId: string }
  | { type: 'external'; address: string }
  | { type: 'webhook'; url: string };

export async function saveCatchAll(
  sdk: FidscriptSDK,
  projectId: string,
  domainId: string,
  target: CatchAllTarget,
): Promise<void> {
  await sdk.email.setCatchAll(projectId, domainId, target);
}

export async function deleteCatchAll(
  sdk: FidscriptSDK,
  projectId: string,
  domainId: string,
): Promise<void> {
  await sdk.email.deleteCatchAll(projectId, domainId);
}
