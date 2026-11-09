import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/enums';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) { }

  create(userId: string, name: string) {
    const slug = `${slugify(name)}-${randomBytes(3).toString('hex')}`;
    // Nested write: workspace + OWNER membership in one atomic operation
    return this.prisma.workspace.create({
      data: {
        name,
        slug,
        members: { create: { userId, role: WorkspaceRole.OWNER } },
      },
    });
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((m) => ({ ...m.workspace, role: m.role }));
  }

  async get(workspaceId: string, role: WorkspaceRole) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { _count: { select: { members: true, projects: true } } },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return { ...ws, role };
  }

  update(workspaceId: string, name: string) {
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: { name } });
  }

  async remove(workspaceId: string) {
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { success: true };
  }

  async listMembers(workspaceId: string) {
    const rows = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt }));
  }

  async changeRole(
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole,
    actorRole: WorkspaceRole,
  ) {
    if (role === WorkspaceRole.OWNER) {
      throw new BadRequestException('Ownership transfer is not supported');
    }
    const target = await this.findMember(workspaceId, targetUserId);
    if (target.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException("Can't change the owner's role");
    }
    // Only the OWNER may touch ADMINs
    if (actorRole !== WorkspaceRole.OWNER &&
      (target.role === WorkspaceRole.ADMIN || role === WorkspaceRole.ADMIN)) {
      throw new ForbiddenException('Only the owner can manage admins');
    }
    return this.prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role },
    });
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    actorId: string,
    actorRole: WorkspaceRole,
  ) {
    const target = await this.findMember(workspaceId, targetUserId);
    if (target.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException("The owner can't be removed or leave");
    }
    const isSelf = targetUserId === actorId;
    if (!isSelf) {
      if (actorRole === WorkspaceRole.MEMBER) throw new ForbiddenException('Insufficient role');
      if (actorRole === WorkspaceRole.ADMIN && target.role === WorkspaceRole.ADMIN) {
        throw new ForbiddenException('Only the owner can remove admins');
      }
    }
    await this.prisma.workspaceMember.delete({ where: { id: target.id } });
    return { success: true };
  }

  private async findMember(workspaceId: string, userId: string) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!m) throw new NotFoundException('Member not found');
    return m;
  }
}
