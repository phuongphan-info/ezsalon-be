import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsNumber, 
  IsBoolean, 
  IsObject,
  Min,
  Max,
  Length,
  IsInt,
  IsPositive
} from 'class-validator';
import { 
  PRODUCT_STATUS, 
  PRODUCT_TYPE, 
  BILLING_INTERVAL 
} from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: 'Product description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Product status', 
    enum: PRODUCT_STATUS,
    default: PRODUCT_STATUS.DRAFT
  })
  @IsEnum(PRODUCT_STATUS)
  @IsOptional()
  status?: PRODUCT_STATUS;

  @ApiProperty({ 
    description: 'Product type', 
    enum: PRODUCT_TYPE,
    default: PRODUCT_TYPE.SUBSCRIPTION
  })
  @IsEnum(PRODUCT_TYPE)
  @IsOptional()
  type?: PRODUCT_TYPE;

  @ApiProperty({ description: 'Price in cents (e.g., 1999 for $19.99)' })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  priceCents: number;

  @ApiProperty({ 
    description: 'Currency code (e.g., USD, EUR)', 
    default: 'USD'
  })
  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @ApiProperty({ 
    description: 'Billing interval for subscription', 
    enum: BILLING_INTERVAL, 
    required: false 
  })
  @IsEnum(BILLING_INTERVAL)
  @IsOptional()
  billingInterval?: BILLING_INTERVAL;

  @ApiProperty({ 
    description: 'Billing interval count (e.g., 1 for every month, 3 for every 3 months)',
    default: 1
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Stripe product ID', required: false })
  @IsString()
  @IsOptional()
  stripeProductId?: string;

  @ApiProperty({ description: 'Stripe price ID', required: false })
  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @ApiProperty({ 
    description: 'Product features as JSON object', 
    required: false,
    example: { 
      "analytics": true, 
      "customBranding": false, 
      "apiAccess": true 
    }
  })
  @IsObject()
  @IsOptional()
  features?: Record<string, any>;

  @ApiProperty({ 
    description: 'Product metadata as JSON object', 
    required: false,
    example: { 
      "popular": true, 
      "recommended": false 
    }
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ 
    description: 'Trial period days for subscription', 
    required: false 
  })
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  trialPeriodDays?: number;

  @ApiProperty({ 
    description: 'Maximum number of salons allowed', 
    required: false 
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSalons?: number;

  @ApiProperty({ 
    description: 'Maximum number of staff per salon', 
    required: false 
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxStaffPerSalon?: number;

  @ApiProperty({ 
    description: 'Whether advanced features are included',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  includesAdvancedFeatures?: boolean;

  @ApiProperty({ 
    description: 'Display order for sorting',
    default: 0
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class UpdateProductDto {
  @ApiProperty({ description: 'Product name', required: false })
  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Product description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Product status', 
    enum: PRODUCT_STATUS,
    required: false
  })
  @IsEnum(PRODUCT_STATUS)
  @IsOptional()
  status?: PRODUCT_STATUS;

  @ApiProperty({ 
    description: 'Product type', 
    enum: PRODUCT_TYPE,
    required: false
  })
  @IsEnum(PRODUCT_TYPE)
  @IsOptional()
  type?: PRODUCT_TYPE;

  @ApiProperty({ 
    description: 'Price in cents (e.g., 1999 for $19.99)', 
    required: false 
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  priceCents?: number;

  @ApiProperty({ 
    description: 'Currency code (e.g., USD, EUR)', 
    required: false
  })
  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @ApiProperty({ 
    description: 'Billing interval for subscription', 
    enum: BILLING_INTERVAL, 
    required: false 
  })
  @IsEnum(BILLING_INTERVAL)
  @IsOptional()
  billingInterval?: BILLING_INTERVAL;

  @ApiProperty({ 
    description: 'Billing interval count (e.g., 1 for every month, 3 for every 3 months)',
    required: false
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Stripe product ID', required: false })
  @IsString()
  @IsOptional()
  stripeProductId?: string;

  @ApiProperty({ description: 'Stripe price ID', required: false })
  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @ApiProperty({ 
    description: 'Product features as JSON object', 
    required: false 
  })
  @IsObject()
  @IsOptional()
  features?: Record<string, any>;

  @ApiProperty({ 
    description: 'Product metadata as JSON object', 
    required: false 
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ 
    description: 'Trial period days for subscription', 
    required: false 
  })
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  trialPeriodDays?: number;

  @ApiProperty({ 
    description: 'Maximum number of salons allowed', 
    required: false 
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSalons?: number;

  @ApiProperty({ 
    description: 'Maximum number of staff per salon', 
    required: false 
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxStaffPerSalon?: number;

  @ApiProperty({ 
    description: 'Whether advanced features are included',
    required: false
  })
  @IsBoolean()
  @IsOptional()
  includesAdvancedFeatures?: boolean;

  @ApiProperty({ 
    description: 'Display order for sorting',
    required: false
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID' })
  uuid: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  description?: string;

  @ApiProperty({ description: 'Product status', enum: PRODUCT_STATUS })
  status: PRODUCT_STATUS;

  @ApiProperty({ description: 'Product type', enum: PRODUCT_TYPE })
  type: PRODUCT_TYPE;

  @ApiProperty({ description: 'Price in cents' })
  priceCents: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Billing interval', enum: BILLING_INTERVAL })
  billingInterval?: BILLING_INTERVAL;

  @ApiProperty({ description: 'Billing interval count' })
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Stripe product ID' })
  stripeProductId?: string;

  @ApiProperty({ description: 'Stripe price ID' })
  stripePriceId?: string;

  @ApiProperty({ description: 'Product features' })
  features?: Record<string, any>;

  @ApiProperty({ description: 'Product metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Trial period days' })
  trialPeriodDays?: number;

  @ApiProperty({ description: 'Maximum salons' })
  maxSalons?: number;

  @ApiProperty({ description: 'Maximum staff per salon' })
  maxStaffPerSalon?: number;

  @ApiProperty({ description: 'Includes advanced features' })
  includesAdvancedFeatures: boolean;

  @ApiProperty({ description: 'Display order' })
  displayOrder: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}