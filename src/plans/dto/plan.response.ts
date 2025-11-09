import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PLAN_STATUS, PLAN_TYPE, BILLING_INTERVAL } from '../entities/plan.entity';

export class PlanResponse {
  @ApiProperty({ description: 'Plan UUID' })
  @Expose()
  uuid: string;

  @ApiProperty({ description: 'Plan name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Plan status', enum: PLAN_STATUS })
  @Expose()
  status: PLAN_STATUS;

  @ApiProperty({ description: 'Plan type', enum: PLAN_TYPE })
  @Expose()
  type: PLAN_TYPE;

  @ApiProperty({ description: 'Price in cents (e.g., 1999 for $19.99)' })
  @Expose()
  priceCents: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, EUR)' })
  @Expose()
  currency: string;

  @ApiProperty({ description: 'Billing interval for subscription', enum: BILLING_INTERVAL })
  @Expose()
  billingInterval: BILLING_INTERVAL;

  @ApiProperty({ description: 'Billing interval count (e.g., 1 for every month, 3 for every 3 months)' })
  @Expose()
  billingIntervalCount: number;

  @ApiPropertyOptional({ description: 'Stripe Product ID' })
  @Expose()
  stripeProductId?: string;

  @ApiPropertyOptional({ description: 'Stripe Price ID' })
  @Expose()
  stripePriceId?: string;

  @ApiPropertyOptional({ description: 'Trial period in days' })
  @Expose()
  trialPeriodDays?: number;

  @ApiPropertyOptional({ description: 'Maximum number of features or limits' })
  @Expose()
  features?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Display order' })
  @Expose()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Whether this plan is featured' })
  @Expose()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'UUID of the user who created this plan' })
  @Expose()
  createdByUuid?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}

export class PlanStatisticsResponse {
  @ApiProperty({ description: 'Total number of plans' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Total number of active plans' })
  @Expose()
  active: number;

  @ApiProperty({ description: 'Total number of inactive plans' })
  @Expose()
  inactive: number;

  @ApiProperty({ description: 'Total number of draft plans' })
  @Expose()
  draft: number;

  @ApiProperty({ description: 'Total number of subscription plans' })
  @Expose()
  subscription: number;

  @ApiProperty({ description: 'Total number of one time plans' })
  @Expose()
  oneTime: number;
}

export class PublicPlanResponse {
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

  @ApiProperty({ description: 'Billing interval for subscription', enum: BILLING_INTERVAL, required: false })
  billingInterval?: BILLING_INTERVAL;

  @ApiProperty({ description: 'Billing interval count (e.g., 1 for every month, 3 for every 3 months)' })
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Trial period days' })
  trialPeriodDays: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}