import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { AcceptInvitationDto } from '@/modules/projects/dto/invitation.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private projectsService: ProjectsService) {}

  @Post('accept')

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.projectsService.acceptInvitation(dto);
  }
}
