import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CUSTOMER_STATUS, GENDER } from '../entities/customer.entity';
import { CUSTOMER_SALON_ROLE } from '../entities/customer-salon.entity';

export class CustomerResponse {
  @ApiProperty({ description: 'Customer UUID' })
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

  @ApiPropertyOptional({ description: 'Date of birth' })
  @Expose()
  @Type(() => Date)
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: [GENDER.FEMALE, GENDER.MALE, GENDER.OTHER],
  })
  @Expose()
  gender?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @Expose()
  address?: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @Expose()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Notes about the customer' })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: 'Customer status',
    enum: [CUSTOMER_STATUS.ACTIVED, CUSTOMER_STATUS.PENDING, CUSTOMER_STATUS.INACTIVED, CUSTOMER_STATUS.BLOCKED],
  })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Whether this customer is an owner (can create salons)' })
  @Expose()
  isOwner: boolean;

  @ApiPropertyOptional({ description: 'UUID of the customer who created this customer record' })
  @Expose()
  createdByUuid?: string;

  @ApiPropertyOptional({ description: 'UUID of the user who created this customer record' })
  @Expose()
  createdByUserUuid?: string;

  @ApiPropertyOptional({
    description: 'Role name from customer_salons join (context-specific)',
    enum: Object.values(CUSTOMER_SALON_ROLE),
  })
  @Expose()
  roleName?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class CustomerPublicResponse {
  @ApiProperty({ description: 'Customer UUID' })
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

  @ApiPropertyOptional({ description: 'Date of birth' })
  @Expose()
  @Type(() => Date)
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: [GENDER.FEMALE, GENDER.MALE, GENDER.OTHER],
  })
  @Expose()
  gender?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @Expose()
  address?: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @Expose()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Notes about the customer' })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ description: 'Whether this is a new user' })
  @Expose()
  isNewUser?: boolean;
}

export class CustomerAuthResponse {
  @ApiProperty({ description: 'Access Token' })
  @Expose()
  accessToken: string;

  @ApiProperty({ description: 'Customer information' })
  @Expose()
  customer: CustomerPublicResponse;
}

export class CustomerSocialResponse {
  @ApiProperty({ description: 'Customer UUID' })
  @Expose()
  uuid: string;

  @ApiProperty({ description: 'Social Name' })
  @Expose()
  socialName: string;

  @ApiProperty({ description: 'Display Name' })
  @Expose()
  displayName: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @Expose()
  avatarUrl?: string;
}

export class CustomerAuthSocialResponse extends CustomerAuthResponse {
  @ApiProperty({ description: 'Social Customer information' })
  @Expose()
  socialAccount: CustomerSocialResponse;
}
