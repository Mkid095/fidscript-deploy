/**
 * MCP Module — permission enforcement, key validation, and audit logging
 * for the MCP server tool execution layer.
 *
 * This module is NOT global — MCP access should be explicitly granted per-project
 * and is scoped to the API key making the request.
 */
import { Module } from '@nestjs/common';
import { McpPermissionService } from './mcp-permission.service';
import { McpApiKeyService } from './mcp-api-key.service';
import { McpAuditLogService } from './mcp-audit-log.service';
import { McpController } from './mcp.controller';

@Module({
  controllers: [McpController],
  providers: [McpPermissionService, McpApiKeyService, McpAuditLogService],
  exports: [McpPermissionService, McpApiKeyService, McpAuditLogService],
})
export class McpModule {}
