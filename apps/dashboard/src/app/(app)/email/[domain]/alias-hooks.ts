import type { EmailAlias, FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';

export interface AliasFormState {
  localPart: string;
  forwardTo: string;
  error: string | null;
  loading: boolean;
}

export function resolveAliasTargets(
  forwardTos: string[],
  mailboxes: Mailbox[],
): Array<{ type: 'mailbox'; mailboxId: string } | { type: 'external'; address: string }> {
  return forwardTos.map(forward => {
    const mb = mailboxes.find(m => m.email.toLowerCase() === forward.toLowerCase());
    if (mb) return { type: 'mailbox' as const, mailboxId: mb.id };
    return { type: 'external' as const, address: forward };
  });
}

export async function createAlias(
  sdk: FidscriptSDK,
  projectId: string,
  domainName: string,
  localPart: string,
  targets: Array<{ type: 'mailbox'; mailboxId: string } | { type: 'external'; address: string }>,
): Promise<EmailAlias> {
  return sdk.email.createAlias(projectId, {
    domain: domainName,
    localPart: localPart.trim(),
    targets,
  });
}
