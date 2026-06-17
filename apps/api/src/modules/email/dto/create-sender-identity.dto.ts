export class CreateSenderIdentityDto {
  /** Domain this identity belongs to */
  domain!: string;
  /**
   * Full email address, e.g. "noreply@example.com".
   * No mailbox is required to exist for this address.
   */
  email!: string;
  /**
   * Local part (extracted if email is provided).
   * Only needed when email and localPart differ (e.g. bouncing addresses).
   */
  localPart?: string;
  /** Display name, e.g. "FIDScript Notifications" */
  name?: string;
}
