import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsUUID, MinLength, Matches, IsBoolean } from 'class-validator';
import { CUSTOMER_STATUS } from '../entities/customer.entity';
import { CUSTOMER_SALON_ROLE } from '../entities/customer-salon.entity';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Phone number (format: +1234567890 or 123-456-7890)', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^(\+\d{1,3}[- ]?)?\d{10}$|^(\+\d{1,3}[- ]?)?\d{3}[- ]?\d{3}[- ]?\d{4}$/, {
    message: 'Phone number must be a valid format (e.g., +1234567890, 123-456-7890, or 1234567890)'
  })
  phone?: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Gender', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Profile avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Notes about the customer', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiHideProperty()
  @IsEnum(CUSTOMER_STATUS)
  @IsOptional()
  status?: string;

  @ApiHideProperty()
  @IsBoolean()
  @IsOptional()
  isOwner?: boolean;

  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  createdByUuid?: string;

  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  ownerUuid?: string;

  @ApiProperty({ description: 'Salon UUID to auto-assign customer to (optional)', required: false })
  @IsUUID()
  @IsOptional()
  salonUuid?: string;

  @ApiProperty({ 
    description: 'Role to assign when auto-assigning to salon (optional, defaults to STAFF)', 
    enum: [CUSTOMER_SALON_ROLE.MANAGER, CUSTOMER_SALON_ROLE.STAFF],
    example: CUSTOMER_SALON_ROLE.STAFF,
    required: false 
  })
  @IsEnum(CUSTOMER_SALON_ROLE)
  @IsOptional()
  customerRoleName?: string;
}

export class UpdateCustomerDto {
  @ApiProperty({ description: 'Full name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Phone number (format: +1234567890 or 123-456-7890)', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^(\+\d{1,3}[- ]?)?\d{10}$|^(\+\d{1,3}[- ]?)?\d{3}[- ]?\d{3}[- ]?\d{4}$/, {
    message: 'Phone number must be a valid format (e.g., +1234567890, 123-456-7890, or 1234567890)'
  })
  phone?: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Gender', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Profile avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Notes about the customer', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiHideProperty()
  @IsEnum(CUSTOMER_STATUS)
  @IsOptional()
  status?: string;
}

export class CustomerLoginDto {
  @ApiProperty({ description: 'Email address', example: 'customer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}
