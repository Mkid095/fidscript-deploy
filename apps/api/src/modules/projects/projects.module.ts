import { Module } from '@nestjs/common';
import { ProjectsController } from '@/modules/projects/controllers/projects.controller';
import { InvitationsController } from '@/modules/projects/controllers/invitations.controller';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { ProjectCrudService } from '@/modules/projects/services/project-crud.service';
import { ProjectMemberService } from '@/modules/projects/services/project-member.service';
import { ProjectEnvService } from '@/modules/projects/services/project-env.service';
import { ProjectInvitationService } from '@/modules/projects/services/project-invitation.service';
import { ProjectApiKeyService } from '@/modules/projects/services/project-api-key.service';

@Module({
  controllers: [ProjectsController, InvitationsController],
  providers: [
    ProjectsService,
    ProjectCrudService,
    ProjectMemberService,
    ProjectEnvService,
    ProjectInvitationService,
    ProjectApiKeyService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
