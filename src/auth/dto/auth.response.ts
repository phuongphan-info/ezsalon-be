import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

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

  @ApiProperty({ description: 'Phone number' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'Profile avatar URL' })
  @Expose()
  avatar?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class UserLoginResponse {
  @ApiProperty({ description: 'Access Token' })
  @Expose()
  accessToken: string;

  @ApiProperty({ description: 'User information' })
  @Expose()
  user: UserResponse;
}

export class UserProfileResponse {
  @ApiProperty({ description: 'User information' })
  @Expose()
  user: UserResponse;

  @ApiProperty({ description: 'User permissions' })
  @Expose()
  permissions: string[];
}
