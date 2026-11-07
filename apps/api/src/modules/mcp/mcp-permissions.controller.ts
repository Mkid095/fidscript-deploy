/**
 * MCP — the CALLER's own permissions.
 *
 * The MCP server asks this before it runs a tool: it needs to know whether
 * MCP is enabled for the key it holds and which scopes that key carries. The
 * key itself is the credential — the server does not have the owner's
 * session.
 *
 * It used to answer "allowed" whatever the key carried, and "allowed" again
 * when the platform could not be reached. The answer is the key's own, and
 * a platform that cannot answer cannot grant.
 */
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';

interface AuthRequest extends Request {
  user?: { id: string };
  apiKey?: { id: string };
}

@ApiTags('mcp')
@Controller('mcp')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class McpPermissionsController {
  constructor(private prisma: PrismaService) {}

  /** The MCP permissions of the calling key. */
  @Get('permissions')
  async getOwnPermissions(@Req() req: AuthRequest) {
    const apiKey = req.apiKey as { id: string } | undefined;
    if (!apiKey) {
      // A session rather than a key: the caller's own key list is the
      // answer, and there is at most one key in play at a time.
      return { mcpEnabled: false, mcpScopes: [] };
    }
    const key = await (this.prisma as any).apiKey.findUnique({
      where: { id: apiKey.id },
      select: { mcpEnabled: true, mcpScopes: true },
    });
    return {
      mcpEnabled: key?.mcpEnabled ?? false,
      mcpScopes: key?.mcpScopes ?? [],
    };
  }
}
