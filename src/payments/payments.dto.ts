import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginatedResponse, PaginationDto } from 'src/common/dto/pagination.dto';
import { PAYMENT_STATUS } from './entities/payment.entity';
import { SUBSCRIPTION_STATUS } from './entities/subscription.entity';
import { PLAN_STATUS, PLAN_TYPE, BILLING_INTERVAL } from '../plans/entities/plan.entity';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Plan UUID from your plans catalog' })
  @IsUUID()
  planUuid: string;

  @ApiProperty({ 
    description: 'URL to redirect to after successful payment',
    example: 'http://localhost:3000/success'
  })
  @Matches(/^https?:\/\/.+/, { message: 'successUrl must be a valid URL starting with http:// or https://' })
  successUrl: string;

  @ApiProperty({ 
    description: 'URL to redirect to if payment is cancelled',
    example: 'http://localhost:3000/cancel'
  })
  @Matches(/^https?:\/\/.+/, { message: 'cancelUrl must be a valid URL starting with http:// or https://' })
  cancelUrl: string;
}

export class CheckoutSessionResponse {
  @ApiProperty({ description: 'Stripe Checkout Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Stripe Checkout Session URL' })
  url: string;
}

export class SubscriptionSummaryDto {
  @ApiProperty({ description: 'Internal subscription UUID' })
  uuid: string;

  @ApiProperty({ description: 'Stripe subscription identifier' })
  stripeSubscriptionUuid: string;

  @ApiProperty({ description: 'Plan UUID tied to this subscription' })
  planUuid: string;

  @ApiProperty({ enum: SUBSCRIPTION_STATUS })
  status: SUBSCRIPTION_STATUS;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  currentPeriodEndAt?: Date | null;
}

export class PaymentHistoryItemDto {
  @ApiProperty({ description: 'Payment UUID' })
  uuid: string;

  @ApiProperty({ description: 'Stripe invoice identifier' })
  stripeInvoiceUuid: string;

  @ApiProperty({ description: 'Stripe payment intent identifier' })
  stripePaymentIntentUuid: string;

  @ApiProperty({ description: 'Amount paid, in major units as string (to preserve precision)' })
  amountPaid: string;

  @ApiProperty({ description: 'ISO currency code' })
  currency: string;

  @ApiProperty({ enum: PAYMENT_STATUS })
  status: PAYMENT_STATUS;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  paidAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: () => SubscriptionSummaryDto, nullable: true })
  subscription?: SubscriptionSummaryDto | null;
}

export class PaymentHistoryResponseDto extends PaginatedResponse<PaymentHistoryItemDto> {
  @ApiProperty({ type: [PaymentHistoryItemDto] })
  declare data: PaymentHistoryItemDto[];

  constructor(data: PaymentHistoryItemDto[], total: number, page: number, limit: number) {
    super(data, total, page, limit);
    this.data = data;
  }
}

export class PaymentHistoryQueryDto extends PaginationDto {
  @ApiProperty({ enum: PAYMENT_STATUS, required: false })
  @IsOptional()
  @IsEnum(PAYMENT_STATUS)
  paymentStatus?: PAYMENT_STATUS;

  @ApiProperty({ enum: SUBSCRIPTION_STATUS, required: false })
  @IsOptional()
  @IsEnum(SUBSCRIPTION_STATUS)
  subscriptionStatus?: SUBSCRIPTION_STATUS;

  @ApiProperty({ description: 'Filter by plan UUID', required: false })
  @IsOptional()
  @IsUUID()
  planUuid?: string;
}

export class SubscriptionPlanSummaryDto {
  @ApiProperty({ description: 'Plan UUID' })
  uuid: string;

  @ApiProperty({ description: 'Plan name' })
  name: string;

  @ApiProperty({ description: 'Plan description', nullable: true })
  description?: string | null;

  @ApiProperty({ enum: PLAN_STATUS })
  status: PLAN_STATUS;

  @ApiProperty({ enum: PLAN_TYPE })
  type: PLAN_TYPE;

  @ApiProperty({ description: 'Price in cents' })
  priceCents: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ enum: BILLING_INTERVAL, nullable: true })
  billingInterval?: BILLING_INTERVAL | null;

  @ApiProperty({ description: 'Billing interval count', nullable: true })
  billingIntervalCount?: number | null;

  @ApiProperty({ description: 'Trial period in days', nullable: true })
  trialPeriodDays?: number | null;

  @ApiProperty({ description: 'Stripe plan ID', nullable: true })
  stripePlanId?: string | null;

  @ApiProperty({ description: 'Stripe price ID', nullable: true })
  stripePriceId?: string | null;

}

export class SubscriptionHistoryItemDto {
  @ApiProperty({ description: 'Subscription UUID' })
  uuid: string;

  @ApiProperty({ description: 'Stripe subscription identifier' })
  stripeSubscriptionUuid: string;

  @ApiProperty({ description: 'Plan UUID associated with the subscription' })
  planUuid: string;

  @ApiProperty({ enum: SUBSCRIPTION_STATUS })
  status: SUBSCRIPTION_STATUS;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  currentPeriodStartAt?: Date | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  currentPeriodEndAt?: Date | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  trialStartAt?: Date | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  trialEndAt?: Date | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  cancelAt?: Date | null;

  @ApiProperty({ description: 'Whether the subscription cancels at period end' })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  canceledAt?: Date | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  paidAt?: Date | null;

  @ApiProperty({ description: 'Latest invoice ID from Stripe', nullable: true })
  latestInvoiceId?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: () => SubscriptionPlanSummaryDto, nullable: true })
  plan?: SubscriptionPlanSummaryDto | null;
}

export class SubscriptionHistoryResponseDto extends PaginatedResponse<SubscriptionHistoryItemDto> {
  @ApiProperty({ type: [SubscriptionHistoryItemDto] })
  declare data: SubscriptionHistoryItemDto[];

  constructor(data: SubscriptionHistoryItemDto[], total: number, page: number, limit: number) {
    super(data, total, page, limit);
    this.data = data;
  }
}

export class SubscriptionHistoryQueryDto extends PaginationDto {
  @ApiProperty({ enum: SUBSCRIPTION_STATUS, required: false })
  @IsOptional()
  @IsEnum(SUBSCRIPTION_STATUS)
  status?: SUBSCRIPTION_STATUS;

  @ApiProperty({ description: 'Filter by plan UUID', required: false })
  @IsOptional()
  @IsUUID()
  planUuid?: string;

  @ApiProperty({ description: 'Filter subscriptions with period starting on or after this timestamp', required: false, type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @ApiProperty({ description: 'Filter subscriptions with period starting on or before this timestamp', required: false, type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startTo?: string;

  @ApiProperty({ description: 'Filter subscriptions with period ending on or after this timestamp', required: false, type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endFrom?: string;

  @ApiProperty({ description: 'Filter subscriptions with period ending on or before this timestamp', required: false, type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endTo?: string;
}