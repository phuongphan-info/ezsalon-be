import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsUUID } from 'class-validator';
import { ROLE } from 'src/roles/entities/role.entity';
import { USER } from '../entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class UserQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Role UUID', required: false })
  @IsUUID()
  @IsOptional()
  roleUuid?: string;

  @ApiProperty({ description: 'Created By UUID', required: false })
  @IsUUID()
  @IsOptional()
  createdByUuid?: string;

  @ApiProperty({
    description: 'Account status',
    enum: [USER.STATUS_ACTIVED, USER.STATUS_INACTIVED, USER.STATUS_PENDING],
    example: USER.STATUS_ACTIVED,
  })
  @IsOptional()
  status?: string;

  @IsOptional()
  search?: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User role',
    example: ROLE.ADMIN,
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Password',
    example: 'password123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User role',
    example: 'customer',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;
}
