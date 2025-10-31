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
  PLAN_STATUS, 
  PLAN_TYPE, 
  BILLING_INTERVAL 
} from '../entities/plan.entity';

export class CreatePlanDto {
  @ApiProperty({ description: 'Plan name' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: 'Plan description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Plan status', 
    enum: PLAN_STATUS,
    default: PLAN_STATUS.DRAFT
  })
  @IsEnum(PLAN_STATUS)
  @IsOptional()
  status?: PLAN_STATUS;

  @ApiProperty({ 
    description: 'Plan type', 
    enum: PLAN_TYPE,
    default: PLAN_TYPE.SUBSCRIPTION
  })
  @IsEnum(PLAN_TYPE)
  @IsOptional()
  type?: PLAN_TYPE;

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

  @ApiProperty({ description: 'Stripe plan ID', required: false })
  @IsString()
  @IsOptional()
  stripePlanId?: string;

  @ApiProperty({ description: 'Stripe price ID', required: false })
  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @ApiProperty({ 
    description: 'Trial period days for subscription',
    required: false,
    default: 7
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
    description: 'Display order for sorting',
    default: 0
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class UpdatePlanDto {
  @ApiProperty({ description: 'Plan name', required: false })
  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Plan description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Plan status', 
    enum: PLAN_STATUS,
    required: false
  })
  @IsEnum(PLAN_STATUS)
  @IsOptional()
  status?: PLAN_STATUS;

  @ApiProperty({ 
    description: 'Plan type', 
    enum: PLAN_TYPE,
    required: false
  })
  @IsEnum(PLAN_TYPE)
  @IsOptional()
  type?: PLAN_TYPE;

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
    required: false,
    default: 1
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Stripe plan ID', required: false })
  @IsString()
  @IsOptional()
  stripePlanId?: string;

  @ApiProperty({ description: 'Stripe price ID', required: false })
  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @ApiProperty({ 
    description: 'Trial period days for subscription', 
    required: false,
    default: 7
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
    description: 'Display order for sorting',
    required: false
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class PlanResponseDto {
  @ApiProperty({ description: 'Plan ID' })
  uuid: string;

  @ApiProperty({ description: 'Plan name' })
  name: string;

  @ApiProperty({ description: 'Plan description' })
  description?: string;

  @ApiProperty({ description: 'Plan status', enum: PLAN_STATUS })
  status: PLAN_STATUS;

  @ApiProperty({ description: 'Plan type', enum: PLAN_TYPE })
  type: PLAN_TYPE;

  @ApiProperty({ description: 'Price in cents' })
  priceCents: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Billing interval', enum: BILLING_INTERVAL })
  billingInterval?: BILLING_INTERVAL;

  @ApiProperty({ description: 'Billing interval count' })
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Stripe plan ID' })
  stripePlanId?: string;

  @ApiProperty({ description: 'Stripe price ID' })
  stripePriceId?: string;

  @ApiProperty({ description: 'Trial period days' })
  trialPeriodDays?: number;

  @ApiProperty({ description: 'Maximum salons' })
  maxSalons?: number;

  @ApiProperty({ description: 'Maximum staff per salon' })
  maxStaffPerSalon?: number;

  @ApiProperty({ description: 'Display order' })
  displayOrder: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class PublicPlanResponseDto {
  @ApiProperty({ description: 'Plan UUID' })
  uuid: string;

  @ApiProperty({ description: 'Plan name' })
  name: string;

  @ApiProperty({ description: 'Plan description' })
  description?: string;

  @ApiProperty({ description: 'Price in cents' })
  priceCents: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Trial period days' })
  trialPeriodDays: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}