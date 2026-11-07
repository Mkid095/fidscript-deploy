import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';
import { ProjectSecretAccessService } from '@/modules/projects/services/project-secret-access.service';

/**
 * The roles that may do what in the functions console.
 *
 * A member with the `viewer` role may read everything and change nothing —
 * no deploying, no invoking, no editing of the variables. A `developer` may
 * write code but not delete the function. The deletion of a function is the
 * owner's and the admin's alone.
 */
export const FUNCTION_WRITE_ROLES = ['owner', 'admin', 'developer'];
export const FUNCTION_ADMIN_ROLES = ['owner', 'admin'];

/**
 * The functions console's own rules about the caller.
 *
 * The functions of a project are code that runs with the project's
 * credentials, so who may do what here is a question about the project's
 * *role* — and the role was enforced nowhere in this module.
 */
@Injectable()
export class FunctionsAccessService {
  constructor(
    private access: ProjectAccessService,
    private secrets: ProjectSecretAccessService,
  ) {}

  /** The caller, as the guard left it. */
  private caller(req: Request): { userId: string; projectId?: string } {
    return req.user as { userId: string; projectId?: string };
  }

  /** Refuse the call unless the caller holds one of the roles. */
  async require(req: Request, projectId: string, roles: string[]): Promise<void> {
    const user = this.caller(req);
    await this.access.checkPermission(user.userId, projectId, roles, user.projectId);
  }

  /** Whether this caller may read the project's secrets. */
  async canSeeSecrets(req: Request, projectId: string): Promise<boolean> {
    const user = this.caller(req);
    return this.secrets.canSeeSecrets(user.userId, projectId);
  }
}
