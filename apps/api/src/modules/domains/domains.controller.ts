import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DomainsService } from './domains.service.js';
import { AddDomainDto } from './dto/index.js';
import { Request } from 'express';

@ApiTags('domains')
@Controller('projects/:projectId/domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Get()
  @ApiOperation({ summary: 'List project domains' })
  async list(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.list(user.userId, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a domain to project' })
  async add(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: AddDomainDto,
  ) {
    const user = req.user as { userId: string };
    return this.domainsService.add(user.userId, projectId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a domain' })
  async delete(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
  ) {
    const user = req.user as { userId: string };
    return this.domainsService.delete(user.userId, projectId, domainId);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify domain DNS configuration' })
  async verify(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
  ) {
    const user = req.user as { userId: string };
    return this.domainsService.verify(user.userId, projectId, domainId);
  }
}
