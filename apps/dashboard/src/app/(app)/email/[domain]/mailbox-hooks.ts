import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';

function randomPassword(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
}

export interface MailboxFormState {
  localPart: string;
  displayName: string;
  error: string | null;
  loading: boolean;
}

export async function createMailbox(
  sdk: FidscriptSDK,
  projectId: string,
  domainName: string,
  localPart: string,
  displayName: string,
): Promise<Mailbox> {
  return sdk.email.createMailbox(projectId, {
    domain: domainName,
    localPart: localPart.trim(),
    password: randomPassword(),
    name: displayName.trim() || undefined,
  });
}
