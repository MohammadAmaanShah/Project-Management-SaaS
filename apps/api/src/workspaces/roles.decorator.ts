import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/enums';

export const ROLES_KEY = 'workspaceRoles';
export const Roles = (...roles: WorkspaceRole[]) => SetMetadata(ROLES_KEY, roles);
