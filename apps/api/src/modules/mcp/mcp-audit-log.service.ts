/**
 * MCP Audit Log Service — append-only audit trail for MCP tool invocations.
 *
 * Every MCP tool call (success or failure) is logged with:
 * - Which key was used
 * - Which tool was called
 * - Whether it was allowed or denied
 * - Trace ID for correlation across API → NATS → Worker
 *
 * This creates a forensic record for security review without slowing down
 * the tool execution path.
 */
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface McpAuditEntry {
  keyId: string;
  keyName?: string;
  tool: string;
  args?: Record<string, unknown>;
  result?: unknown;
  allowed: boolean;
  denialReason?: string;
  traceId?: string;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

@Injectable()
export class McpAuditLogService {
  private readonly logger = new Logger(McpAuditLogService.name);

  /**
   * Log an MCP tool invocation.
   * In Phase 1 this writes to the NestJS logger (structured audit).
   * In production this would write to a dedicated audit log table.
   */
  log(entry: McpAuditEntry): void {
    const timestamp = entry.timestamp ?? new Date();
    const traceId = entry.traceId ?? randomUUID();

    const logData = {
      '@mcp-audit': true,
      keyId: entry.keyId,
      keyName: entry.keyName,
      tool: entry.tool,
      allowed: entry.allowed,
      denialReason: entry.denialReason,
      traceId,
      durationMs: entry.durationMs,
      ipAddress: entry.ipAddress,
      timestamp: timestamp.toISOString(),
    };

    if (entry.allowed) {
      this.logger.log(`[MCP] tool=${entry.tool} key=${entry.keyId} allowed=true duration=${entry.durationMs}ms`, logData);
    } else {
      this.logger.warn(`[MCP] tool=${entry.tool} key=${entry.keyId} allowed=false reason=${entry.denialReason}`, logData);
    }
  }

  /** Build an audit entry for a denied call. */
  denied(
    keyId: string,
    tool: string,
    reason: string,
    traceId?: string,
  ): McpAuditEntry {
    return {
      keyId,
      tool,
      allowed: false,
      denialReason: reason,
      traceId,
      timestamp: new Date(),
    };
  }

  /** Build an audit entry for an allowed call. */
  allowed(
    keyId: string,
    keyName: string | undefined,
    tool: string,
    result: unknown,
    durationMs: number,
    traceId?: string,
  ): McpAuditEntry {
    return {
      keyId,
      keyName,
      tool,
      result,
      allowed: true,
      durationMs,
      traceId,
      timestamp: new Date(),
    };
  }
}
