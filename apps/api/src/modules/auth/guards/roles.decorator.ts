import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './platform-admin.guard';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);