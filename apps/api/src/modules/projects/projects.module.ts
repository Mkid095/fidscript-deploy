import { Module, forwardRef } from '@nestjs/common';
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
import { ProjectProvisionService } from '@/modules/projects/services/project-provision.service';
import { StorageModule } from '@/modules/storage/storage.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { DatabasesModule } from '@/modules/databases/databases.module';

@Module({
  controllers: [
    ProjectsCrudController,
    ProjectsMembersController,
    InvitationsController,
  ],
  imports: [forwardRef(() => StorageModule), RealtimeModule, DatabasesModule],
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
    ProjectProvisionService,
  ],
  exports: [
    ProjectsService,
    ProjectApiKeyService,
    ProjectAccessService,
    ProjectMemberService,
    ProjectProvisionService,
  ],
})
export class ProjectsModule {}
