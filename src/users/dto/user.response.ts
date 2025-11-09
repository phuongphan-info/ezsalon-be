import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { USER } from '../entities/user.entity';

export class UserResponse {
  @ApiProperty({ description: 'User UUID' })
  @Expose()
  uuid: string;

  @ApiProperty({ description: 'Email address' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Full name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @Expose()
  avatar?: string;

  @ApiProperty({
    description: 'Account status',
    enum: [USER.STATUS_ACTIVED, USER.STATUS_INACTIVED, USER.STATUS_PENDING],
  })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Role UUID' })
  @Expose()
  roleUuid?: string;

  @ApiProperty({ description: 'Role name' })
  @Expose()
  roleName?: string;

  @ApiPropertyOptional({ description: 'Creator user UUID' })
  @Expose()
  createdByUuid?: string;

  @ApiPropertyOptional({ description: 'Creator user name' })
  @Expose()
  createdByName?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

