import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.params.workspaceId;
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    });
    // 403 (not 404) for non-members so we don't leak which workspaces exist
    if (!membership) throw new ForbiddenException('Not a member of this workspace');

    const roles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.length && !roles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    req.membership = membership;
    return true;
  }
}
