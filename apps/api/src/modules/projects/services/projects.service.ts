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
  get(userId: string, projectId: string, keyProjectId?: string) { return this.crud.get(userId, projectId, keyProjectId); }
  update(userId: string, projectId: string, dto: any, keyProjectId?: string) { return this.crud.update(userId, projectId, dto, keyProjectId); }
  delete(userId: string, projectId: string, keyProjectId?: string) { return this.crud.delete(userId, projectId, keyProjectId); }
  requestPurgeVerification(userId: string, projectId: string, keyProjectId?: string) { return this.crud.requestPurgeVerification(userId, projectId, keyProjectId); }
  purge(userId: string, projectId: string, code: string, keyProjectId?: string) { return this.crud.purge(userId, projectId, code, keyProjectId); }
  suspend(userId: string, projectId: string, keyProjectId?: string) { return this.crud.suspend(userId, projectId, keyProjectId); }
  archive(userId: string, projectId: string, keyProjectId?: string) { return this.crud.archive(userId, projectId, keyProjectId); }
  restore(userId: string, projectId: string, keyProjectId?: string) { return this.crud.restore(userId, projectId, keyProjectId); }
  clone(userId: string, projectId: string, dto: any, keyProjectId?: string) { return this.crud.clone(userId, projectId, dto, keyProjectId); }
  getProjectEvents(userId: string, projectId: string, limit?: number, keyProjectId?: string) { return this.crud.getProjectEvents(userId, projectId, limit, keyProjectId); }

  // Members
  listMembers(userId: string, projectId: string, keyProjectId?: string) { return this.members.listMembers(userId, projectId, keyProjectId); }
  addMember(userId: string, projectId: string, dto: any, keyProjectId?: string) { return this.members.addMember(userId, projectId, dto, keyProjectId); }
  removeMember(userId: string, projectId: string, memberUserId: string, keyProjectId?: string) { return this.members.removeMember(userId, projectId, memberUserId, keyProjectId); }
  updateMemberRole(userId: string, projectId: string, memberUserId: string, role: 'admin' | 'developer' | 'viewer', keyProjectId?: string) {
    return this.members.updateMemberRole(userId, projectId, memberUserId, role, keyProjectId);
  }

  // Env vars
  getEnvVars(userId: string, projectId: string, keyProjectId?: string) { return this.env.getEnvVars(userId, projectId, keyProjectId); }
  updateEnvVars(userId: string, projectId: string, dto: any, keyProjectId?: string) { return this.env.updateEnvVars(userId, projectId, dto, keyProjectId); }
  deleteEnvVar(userId: string, projectId: string, key: string, keyProjectId?: string) { return this.env.deleteEnvVar(userId, projectId, key, keyProjectId); }

  // Invitations
  createInvitation(userId: string, projectId: string, dto: any, keyProjectId?: string) { return this.invitations.createInvitation(userId, projectId, dto, keyProjectId); }
  acceptInvitation(dto: any) { return this.invitations.acceptInvitation(dto); }
  listInvitations(userId: string, projectId: string, keyProjectId?: string) { return this.invitations.listInvitations(userId, projectId, keyProjectId); }
  revokeInvitation(userId: string, projectId: string, invitationId: string, keyProjectId?: string) { return this.invitations.revokeInvitation(userId, projectId, invitationId, keyProjectId); }

  // API keys
  createProjectApiKey(userId: string, projectId: string, dto: any, keyProjectId?: string) { return this.apiKeys.createProjectApiKey(userId, projectId, dto, keyProjectId); }
  listProjectApiKeys(userId: string, projectId: string, keyProjectId?: string) { return this.apiKeys.listProjectApiKeys(userId, projectId, keyProjectId); }
  revokeProjectApiKey(userId: string, projectId: string, keyId: string, keyProjectId?: string) { return this.apiKeys.revokeProjectApiKey(userId, projectId, keyId, keyProjectId); }
}
