import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';

export class CreateSalonDto {
  @ApiProperty({ description: 'Salon name', example: 'Beauty Palace' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Salon description',
    example: 'Premium beauty salon',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Salon address',
    example: '123 Main St, City, State 12345',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    description: 'Salon phone number',
    example: '+1-234-567-8900',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    description: 'Salon email',
    example: 'contact@beautypalace.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Business hours',
    example: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 7:00 PM',
      saturday: '8:00 AM - 5:00 PM',
      sunday: 'Closed',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  businessHours?: Record<string, any>;

  @ApiProperty({
    description: 'Salon website URL',
    example: 'https://beautypalace.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Salon logo URL',
    example: 'https://beautypalace.com/logo.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  logo?: string;
}

export class UpdateSalonDto {
  @ApiProperty({
    description: 'Salon name',
    example: 'Beauty Palace',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Salon description',
    example: 'Premium beauty salon',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Salon address',
    example: '123 Main St, City, State 12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Salon phone number',
    example: '+1-234-567-8900',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Salon email',
    example: 'contact@beautypalace.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Business hours',
    example: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 7:00 PM',
      saturday: '8:00 AM - 5:00 PM',
      sunday: 'Closed',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  businessHours?: Record<string, any>;

  @ApiProperty({
    description: 'Salon website URL',
    example: 'https://beautypalace.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Salon logo URL',
    example: 'https://beautypalace.com/logo.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
