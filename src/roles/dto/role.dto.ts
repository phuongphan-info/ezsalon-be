import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name (unique identifier)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Role display name' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: 'Role description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Role color for UI', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: 'Permission names to assign to this role',
    type: [String],
    required: false,
    example: ['users:create', 'users:read', 'roles:create']
  })
  @IsArray()
  @IsOptional()
  permissionNames?: string[];
}

export class UpdateRoleDto {
  @ApiProperty({ description: 'Role display name', required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ description: 'Role description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Role color for UI', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: 'Permission names to assign to this role',
    type: [String],
    required: false,
    example: ['users:create', 'users:read', 'roles:create']
  })
  @IsArray()
  @IsOptional()
  permissionNames?: string[];
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Permission names to assign to the role',
    type: [String],
    example: ['users:create', 'users:read', 'roles:create']
  })
  @IsArray()
  @IsNotEmpty()
  permissionNames: string[];
}
