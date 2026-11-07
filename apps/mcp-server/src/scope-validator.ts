/**
 * The MCP server's permission check.
 *
 * The key is the credential. The platform answers two questions with it:
 * which scopes does it carry, and which scopes does this tool need. The key
 * has to have MCP enabled and to carry every scope the tool requires.
 *
 * It used to answer neither: the check fetched the tools list and allowed
 * everything whatever it said — and allowed everything again when the API
 * could not be reached. An MCP key with no scopes could run every tool the
 * platform has.
 */

export interface ScopeVerdict {
  allowed: boolean;
  reason?: string;
}

/** Check the key's scopes against the scopes a tool needs. */
export async function validateScope(
  apiUrl: string,
  apiKey: string,
  toolName: string,
): Promise<ScopeVerdict> {
  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const [toolsRes, permissionsRes] = await Promise.all([
      fetch(`${apiUrl}/api/v1/mcp/tools`, { headers }),
      fetch(`${apiUrl}/api/v1/mcp/permissions`, { headers }),
    ]);
    if (!toolsRes.ok || !permissionsRes.ok) {
      // The platform cannot answer, so the platform cannot grant. Failing
      // open here is what made the check meaningless.
      return { allowed: false, reason: "The platform could not confirm this key's permissions" };
    }

    const tools = (await toolsRes.json()) as { tool: string; permissions: string[] }[];
    const required = tools.find(t => t.tool === toolName)?.permissions;
    if (!required) {
      return { allowed: false, reason: `Unknown tool: ${toolName}` };
    }

    const { mcpEnabled, mcpScopes } = (await permissionsRes.json()) as {
      mcpEnabled: boolean;
      mcpScopes: string[];
    };
    if (!mcpEnabled) {
      return { allowed: false, reason: 'MCP access is not enabled for this key' };
    }
    // No scopes means full access — the same rule the platform uses.
    if (!mcpScopes || mcpScopes.length === 0) {
      return { allowed: true };
    }

    const missing = required.filter(p => !mcpScopes.includes(p));
    if (missing.length > 0) {
      return { allowed: false, reason: `Missing scope(s): ${missing.join(', ')}` };
    }
    return { allowed: true };
  } catch (err) {
    // The platform is unreachable: the tool cannot run against it anyway,
    // and a network error is not a permission.
    return {
      allowed: false,
      reason:
        err instanceof Error
          ? `Could not reach the platform: ${err.message}`
          : 'Could not reach the platform',
    };
  }
}
