import { Injectable } from '@nestjs/common';
import { ProjectCrudService } from '@/modules/projects/services/project-crud.service';
import { ProjectMemberService } from '@/modules/projects/services/project-member.service';
import { ProjectEnvService } from '@/modules/projects/services/project-env.service';
import { ProjectInvitationService } from '@/modules/projects/services/project-invitation.service';
import { ProjectApiKeyService } from '@/modules/projects/services/project-api-key.service';

@Injectable()
export class ProjectsService {
  constructor(
    private crud: ProjectCrudService,
    private members: ProjectMemberService,
    private env: ProjectEnvService,
    private invitations: ProjectInvitationService,
    private apiKeys: ProjectApiKeyService,
  ) {}

  // CRUD
  create(userId: string, dto: any) { return this.crud.create(userId, dto); }
  list(userId: string, options?: any) { return this.crud.list(userId, options); }
  get(userId: string, projectId: string) { return this.crud.get(userId, projectId); }
  update(userId: string, projectId: string, dto: any) { return this.crud.update(userId, projectId, dto); }
  delete(userId: string, projectId: string) { return this.crud.delete(userId, projectId); }
  suspend(userId: string, projectId: string) { return this.crud.suspend(userId, projectId); }
  archive(userId: string, projectId: string) { return this.crud.archive(userId, projectId); }
  restore(userId: string, projectId: string) { return this.crud.restore(userId, projectId); }
  clone(userId: string, projectId: string, dto: any) { return this.crud.clone(userId, projectId, dto); }
  getProjectEvents(userId: string, projectId: string, limit?: number) { return this.crud.getProjectEvents(userId, projectId, limit); }

  // Members
  listMembers(userId: string, projectId: string) { return this.members.listMembers(userId, projectId); }
  addMember(userId: string, projectId: string, dto: any) { return this.members.addMember(userId, projectId, dto); }
  removeMember(userId: string, projectId: string, memberUserId: string) { return this.members.removeMember(userId, projectId, memberUserId); }

  // Env vars
  getEnvVars(userId: string, projectId: string) { return this.env.getEnvVars(userId, projectId); }
  updateEnvVars(userId: string, projectId: string, dto: any) { return this.env.updateEnvVars(userId, projectId, dto); }
  deleteEnvVar(userId: string, projectId: string, key: string) { return this.env.deleteEnvVar(userId, projectId, key); }

  // Invitations
  createInvitation(userId: string, projectId: string, dto: any) { return this.invitations.createInvitation(userId, projectId, dto); }
  acceptInvitation(dto: any) { return this.invitations.acceptInvitation(dto); }
  listInvitations(userId: string, projectId: string) { return this.invitations.listInvitations(userId, projectId); }
  revokeInvitation(userId: string, projectId: string, invitationId: string) { return this.invitations.revokeInvitation(userId, projectId, invitationId); }

  // API keys
  createProjectApiKey(userId: string, projectId: string, dto: any) { return this.apiKeys.createProjectApiKey(userId, projectId, dto); }
  listProjectApiKeys(userId: string, projectId: string) { return this.apiKeys.listProjectApiKeys(userId, projectId); }
  revokeProjectApiKey(userId: string, projectId: string, keyId: string) { return this.apiKeys.revokeProjectApiKey(userId, projectId, keyId); }
}
