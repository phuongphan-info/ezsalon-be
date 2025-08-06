import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name (unique identifier)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Permission display name' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: 'Permission description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Permission resource (e.g., users, bookings)' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    description: 'Permission action (e.g., create, read, update, delete)',
  })
  @IsString()
  @IsNotEmpty()
  action: string;
}

export class UpdatePermissionDto {
  @ApiProperty({ description: 'Permission display name', required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ description: 'Permission description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Permission resource', required: false })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiProperty({ description: 'Permission action', required: false })
  @IsString()
  @IsOptional()
  action?: string;
}
