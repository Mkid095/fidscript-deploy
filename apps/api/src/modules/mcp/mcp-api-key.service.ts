/**
 * MCP API Key Service — validates MCP keys and their scopes.
 *
 * Used by the MCP server auth middleware to:
 * - Verify the API key is MCP-enabled
 * - Check the key has required scopes for the requested tool
 * - Log audit trail for every MCP tool invocation
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { McpPermissionService, Permission } from './mcp-permission.service';

export interface McpKeyValidation {
  valid: boolean;
  reason?: string;
  scopes: string[];
  userId?: string;
}

@Injectable()
export class McpApiKeyService {
  private readonly logger = new Logger(McpApiKeyService.name);

  constructor(
    private prisma: PrismaService,
    private permissions: McpPermissionService,
  ) {}

  /**
   * Validate an API key for MCP usage.
   * Returns { valid: true, scopes, userId } on success.
   */
  async validateKey(keyId: string, toolName: string): Promise<McpKeyValidation> {
    const keyHash = this.hashKey(keyId);

    const key = await (this.prisma as any).apiKey.findUnique({
      where: { keyHash },
      select: { id: true, userId: true, mcpEnabled: true, mcpScopes: true },
    });

    if (!key) {
      return { valid: false, reason: 'Invalid API key', scopes: [] };
    }

    if (!key.mcpEnabled) {
      return { valid: false, reason: 'MCP access is not enabled for this key', scopes: [] };
    }

    const scopes = key.mcpScopes ?? [];
    const hasAccess = this.permissions.canAccess(scopes, toolName);

    if (!hasAccess) {
      this.logger.warn(
        `MCP access denied: keyId=${key.id} tool=${toolName} scopes=[${scopes.join(', ')}]`,
      );
      return { valid: false, reason: `Missing required permissions for tool: ${toolName}`, scopes };
    }

    return { valid: true, scopes, userId: key.userId };
  }

  /** Get the Prisma record for a key (used by audit log). */
  async getKeyRecord(keyId: string) {
    const keyHash = this.hashKey(keyId);
    return (this.prisma as any).apiKey.findUnique({
      where: { keyHash },
      select: { id: true, userId: true, name: true, mcpScopes: true },
    });
  }

  private hashKey(keyId: string): string {
    // SHA-256 hash of the key ID — matches how ApiKeyService stores keys
    const { createHash } = require('crypto');
    return createHash('sha256').update(keyId).digest('hex');
  }
}
