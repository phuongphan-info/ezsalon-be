import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ROLE } from 'src/roles/entities/role.entity';
import { Expose } from 'class-transformer';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../entities/user.entity';

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

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  uuid: string;

  @ApiProperty({ description: 'Email address' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Full name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Phone number' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'User role', type: () => Role })
  @Expose()
  role: Role;

  @ApiProperty({ description: 'Profile avatar URL' })
  @Expose()
  avatar: string;

  @ApiProperty({
    description: 'Account status',
    enum: ['ACTIVED', 'INACTIVED', 'PENDING'],
    example: 'ACTIVED',
  })
  @Expose()
  status: string;

  @ApiProperty({
    description: 'User who created this user',
    type: () => UserResponseDto,
    required: false,
  })
  @Expose()
  createdBy?: UserResponseDto;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  updatedAt: Date;

  constructor(user: User) {
    this.uuid = user.uuid;
    this.email = user.email;
    this.name = user.name;
    this.phone = user.phone;
    this.role = user.role;
    this.avatar = user.avatar;
    this.status = user.status;
    this.createdBy = user.createdBy ? new UserResponseDto(user.createdBy) : undefined;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
