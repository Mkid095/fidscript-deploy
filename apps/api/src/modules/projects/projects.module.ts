import { Module } from '@nestjs/common';
import { ProjectsCrudController } from '@/modules/projects/controllers/projects-crud.controller';
import { ProjectsMembersController } from '@/modules/projects/controllers/projects-members.controller';
import { InvitationsController } from '@/modules/projects/controllers/invitations.controller';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { ProjectCrudService } from '@/modules/projects/services/project-crud.service';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';
import { ProjectMemberService } from '@/modules/projects/services/project-member.service';
import { ProjectEnvService } from '@/modules/projects/services/project-env.service';
import { ProjectInvitationService } from '@/modules/projects/services/project-invitation.service';
import { ProjectApiKeyService } from '@/modules/projects/services/project-api-key.service';
import { ProjectFormatService } from '@/modules/projects/services/project-format.service';
import { ProjectCreateService } from '@/modules/projects/services/project-create.service';

@Module({
  controllers: [
    ProjectsCrudController,
    ProjectsMembersController,
    InvitationsController,
  ],
  providers: [
    ProjectsService,
    ProjectCrudService,
    ProjectAccessService,
    ProjectMemberService,
    ProjectEnvService,
    ProjectInvitationService,
    ProjectApiKeyService,
    ProjectFormatService,
    ProjectCreateService,
  ],
  exports: [ProjectsService, ProjectApiKeyService, ProjectAccessService],
})
export class ProjectsModule {}
