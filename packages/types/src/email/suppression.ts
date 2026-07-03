/**
 * Email suppression types — shared across API, SDK, and MCP contracts.
 */

export type SuppressionReason = 'BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT' | 'MANUAL';

/** A suppressed email recipient. */
export interface EmailSuppression {
  id: string;
  domainId: string;
  email: string;
  reason: SuppressionReason;
  createdAt: string;
}
