import { Module } from '@nestjs/common';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceMemberGuard],
  exports: [WorkspacesService, WorkspaceMemberGuard],
})
export class WorkspacesModule {}
