/**
 * MCP Admin Controller — manage MCP API keys and scopes.
 *
 * Endpoints:
 *   GET  /api/v1/mcp/keys/:id        — get MCP key info + scopes
 *   PATCH /api/v1/mcp/keys/:id/scopes — update mcpScopes for a key
 *   POST /api/v1/mcp/keys/:id/enable  — enable MCP on a key
 *   POST /api/v1/mcp/keys/:id/disable — disable MCP on a key
 *   GET  /api/v1/mcp/tools           — list all MCP tools + required permissions
 *
 * All endpoints require authentication.
 */
import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { McpPermissionService, TOOL_PERMISSIONS, Permission } from './mcp-permission.service';

interface AuthRequest extends Request {
  user?: { id: string };
}

@Controller('api/v1/mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(
    private prisma: PrismaService,
    private permissions: McpPermissionService,
  ) {}

  /** List all MCP tools and their required permissions. */
  @Get('tools')
  listTools() {
    return Object.entries(TOOL_PERMISSIONS).map(([tool, perms]) => ({
      tool,
      permissions: perms,
    }));
  }

  /** Get MCP info for a specific API key. */
  @Get('keys/:id')
  async getKey(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = req.user?.id;
    const key = await (this.prisma as any).apiKey.findUnique({
      where: { id },
      select: { id: true, name: true, userId: true, mcpEnabled: true, mcpScopes: true },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== userId) throw new ForbiddenException('Not your key');

    return {
      id: key.id,
      name: key.name,
      mcpEnabled: key.mcpEnabled,
      mcpScopes: key.mcpScopes,
    };
  }

  /** Update MCP scopes for a key. */
  @Patch('keys/:id/scopes')
  async updateScopes(@Param('id') id: string, @Body() body: { scopes: string[] }, @Req() req: AuthRequest) {
    const userId = req.user?.id;

    const key = await (this.prisma as any).apiKey.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== userId) throw new ForbiddenException('Not your key');

    // Validate all scopes
    const invalid = body.scopes.filter(s => !this.permissions.isValidScope(s));
    if (invalid.length > 0) {
      throw new ForbiddenException(`Invalid scopes: ${invalid.join(', ')}. Valid: ${this.permissions.getAllPermissions().join(', ')}`);
    }

    const updated = await (this.prisma as any).apiKey.update({
      where: { id },
      data: { mcpScopes: body.scopes },
      select: { id: true, mcpScopes: true },
    });

    return { id: updated.id, mcpScopes: updated.mcpScopes };
  }

  /** Enable MCP on a key. */
  @Post('keys/:id/enable')
  async enableMcp(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = req.user?.id;

    const key = await (this.prisma as any).apiKey.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== userId) throw new ForbiddenException('Not your key');

    await (this.prisma as any).apiKey.update({
      where: { id },
      data: { mcpEnabled: true },
    });

    return { id, mcpEnabled: true };
  }

  /** Disable MCP on a key. */
  @Post('keys/:id/disable')
  async disableMcp(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = req.user?.id;

    const key = await (this.prisma as any).apiKey.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.userId !== userId) throw new ForbiddenException('Not your key');

    await (this.prisma as any).apiKey.update({
      where: { id },
      data: { mcpEnabled: false },
    });

    return { id, mcpEnabled: false };
  }
}
