/**
 * Email analytics types — shared across API, SDK, and MCP contracts.
 */

import type { EmailFailureType } from './message.js';

/** Delivery overview metrics. */
export interface DeliveryOverview {
  total: number;
  rangeDays: number;
  byStatus: {
    queued: number;
    processing: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    softBounce: number;
    dead: number;
    failed: number;
    received: number;
  };
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
}

/** Failure breakdown by failure type. */
export interface FailureBreakdown {
  failureType: EmailFailureType | string;
  count: number;
  avgDurationMs: number;
}

/** Delivery latency percentiles. */
export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

/** Daily send timeline entry. */
export interface SendTimelineEntry {
  date: string;
  sent: number;
  bounced: number;
  failed: number;
}
