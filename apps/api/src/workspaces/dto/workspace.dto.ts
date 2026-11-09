import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { WorkspaceRole } from '../../generated/prisma/enums';

export class CreateWorkspaceDto {
  @IsString() @MinLength(2) @MaxLength(60) name: string;
}

export class UpdateWorkspaceDto {
  @IsString() @MinLength(2) @MaxLength(60) name: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(WorkspaceRole) role: WorkspaceRole;
}
