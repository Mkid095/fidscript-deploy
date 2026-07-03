/**
 * MCP Permission Service — tool-level permission registry for MCP server.
 *
 * Defines which permissions each MCP tool requires, and provides validation
 * logic checked before every MCP tool call.
 *
 * Permission model:
 * - Each MCP tool maps to one or more Permission values
 * - An MCP API key has a set of mcpScopes (subset of Permission values)
 * - Empty mcpScopes = full access (legacy/initial keys)
 * - mcpEnabled must be true to use MCP at all
 */
import { Injectable } from '@nestjs/common';

// ── Permission definitions ────────────────────────────────────────────────────

export enum Permission {
  // Email permissions
  EMAIL_SEND = 'email:send',
  EMAIL_READ = 'email:read',
  EMAIL_ADMIN = 'email:admin', // templates, webhooks, suppressions

  // Domain permissions
  DOMAINS_READ = 'domains:read',
  DOMAINS_WRITE = 'domains:write',

  // Project permissions
  PROJECTS_READ = 'projects:read',
  PROJECTS_ADMIN = 'projects:admin',
}

// ── Tool → Permissions mapping ───────────────────────────────────────────────

export const TOOL_PERMISSIONS: Record<string, Permission[]> = {
  // Email tools
  email_send: [Permission.EMAIL_SEND],
  email_send_template: [Permission.EMAIL_SEND],
  email_inbox: [Permission.EMAIL_READ],
  email_status: [Permission.EMAIL_READ],
  email_templates: [Permission.EMAIL_ADMIN],
  email_domains: [Permission.EMAIL_READ],
  email_analytics: [Permission.EMAIL_READ],
  email_suppressions: [Permission.EMAIL_ADMIN],
  // Domain tools
  domain_list: [Permission.DOMAINS_READ],
  domain_add: [Permission.DOMAINS_WRITE],
  domain_verify: [Permission.DOMAINS_WRITE],
  // Project tools
  project_list: [Permission.PROJECTS_READ],
  project_create: [Permission.PROJECTS_ADMIN],
};

@Injectable()
export class McpPermissionService {
  /**
   * Check whether a given set of scopes grants access to a specific tool.
   * Empty scopes array = full access (bypass check).
   */
  canAccess(scopes: string[], toolName: string): boolean {
    if (scopes.length === 0) return true; // Full access

    const required = TOOL_PERMISSIONS[toolName];
    if (!required) return false; // Unknown tool = deny

    // All required permissions must be present in scopes
    return required.every(p => scopes.includes(p));
  }

  /** Get all permissions required for a tool. Returns undefined if tool unknown. */
  getRequiredPermissions(toolName: string): Permission[] | undefined {
    return TOOL_PERMISSIONS[toolName];
  }

  /** Validate a scope string is a known Permission value. */
  isValidScope(scope: string): scope is Permission {
    return Object.values(Permission).includes(scope as Permission);
  }

  /** Get all valid permission values. */
  getAllPermissions(): string[] {
    return Object.values(Permission);
  }
}
