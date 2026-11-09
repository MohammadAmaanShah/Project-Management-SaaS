import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  CreateWorkspaceDto, UpdateMemberRoleDto, UpdateWorkspaceDto,
} from './dto/workspace.dto';
import { Roles } from './roles.decorator';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private ws: WorkspacesService) { }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateWorkspaceDto) {
    return this.ws.create(u.id, dto.name);
  }

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.ws.listForUser(u.id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(':workspaceId')
  get(@Param('workspaceId') id: string, @Req() req: any) {
    return this.ws.get(id, req.membership.role);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Patch(':workspaceId')
  update(@Param('workspaceId') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.ws.update(id, dto.name);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Roles(WorkspaceRole.OWNER)
  @Delete(':workspaceId')
  remove(@Param('workspaceId') id: string) {
    return this.ws.remove(id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(':workspaceId/members')
  members(@Param('workspaceId') id: string) {
    return this.ws.listMembers(id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Patch(':workspaceId/members/:userId')
  changeRole(
    @Param('workspaceId') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: any,
  ) {
    return this.ws.changeRole(id, userId, dto.role, req.membership.role);
  }

  // No @Roles: any member may call it, because members can remove themselves (leave).
  // The service enforces who can remove whom.
  @UseGuards(WorkspaceMemberGuard)
  @Delete(':workspaceId/members/:userId')
  removeMember(
    @Param('workspaceId') id: string,
    @Param('userId') userId: string,
    @CurrentUser() u: AuthUser,
    @Req() req: any,
  ) {
    return this.ws.removeMember(id, userId, u.id, req.membership.role);
  }
}
