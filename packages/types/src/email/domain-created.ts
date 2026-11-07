/**
 * What the platform answers when an email domain is created.
 *
 * The API returns the row **and** the instructions: the ownership token and
 * the DNS records the operator has to add before the domain can receive
 * mail. The dashboard used to cast the whole envelope to a row, which put
 * the instructions in the bin and took the page down with it.
 */
import type { EmailDomain } from './message.js';

export interface EmailDomainCreated {
  /** The domain that was created. */
  domain: EmailDomain;
  /** The token the TXT ownership record has to carry. */
  ownershipToken: string;
  /** The DNS records to add, in the order they have to be added. */
  steps: string[];
}
