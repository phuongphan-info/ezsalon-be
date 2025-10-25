import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export const PRODUCT_TABLE_NAME = 'products';

export enum PRODUCT_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export enum PRODUCT_TYPE {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_TIME = 'ONE_TIME',
}

export enum BILLING_INTERVAL {
  MONTH = 'month',
  YEAR = 'year',
}

@Entity(PRODUCT_TABLE_NAME)
export class Product {
  @ApiProperty({ description: 'Product ID' })
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Product name' })
  @Column({ name: 'product_name' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @ApiProperty({ description: 'Product status', enum: PRODUCT_STATUS })
  @Column({ type: 'enum', enum: PRODUCT_STATUS, default: PRODUCT_STATUS.DRAFT, name: 'status' })
  status: PRODUCT_STATUS;

  @ApiProperty({ description: 'Product type', enum: PRODUCT_TYPE })
  @Column({ type: 'enum', enum: PRODUCT_TYPE, default: PRODUCT_TYPE.SUBSCRIPTION, name: 'type' })
  type: PRODUCT_TYPE;

  @ApiProperty({ description: 'Price in cents (e.g., 1999 for $19.99)' })
  @Column({ type: 'int', name: 'price_cents' })
  priceCents: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, EUR)' })
  @Column({ length: 3, default: 'USD', name: 'currency' })
  currency: string;

  @ApiProperty({ description: 'Billing interval for subscription', enum: BILLING_INTERVAL, required: false })
  @Column({ type: 'enum', enum: BILLING_INTERVAL, default: BILLING_INTERVAL.MONTH, name: 'billing_interval' })
  billingInterval?: BILLING_INTERVAL;

  @ApiProperty({ description: 'Billing interval count (e.g., 1 for every month, 3 for every 3 months)' })
  @Column({ type: 'int', nullable: true, default: 1, name: 'billing_interval_count' })
  billingIntervalCount?: number;

  @ApiProperty({ description: 'Stripe product ID' })
  @Column({ nullable: true, name: 'stripe_product_id' })
  stripeProductId?: string;

  @ApiProperty({ description: 'Stripe price ID' })
  @Column({ nullable: true, name: 'stripe_price_id' })
  stripePriceId?: string;

  @ApiProperty({ description: 'Maximum number of salons allowed' })
  @Column({ type: 'int', nullable: true, name: 'max_salons' })
  maxSalons?: number;

  @ApiProperty({ description: 'Maximum number of staff per salon' })
  @Column({ type: 'int', nullable: true, name: 'max_staff_per_salon' })
  maxStaffPerSalon?: number;

  @ApiProperty({ description: 'Display order for sorting' })
  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder: number;

  @ApiProperty({ description: 'Trial period in days (0 for no trial)' })
  @Column({ type: 'int', default: 7, name: 'trial_period_days' })
  trialPeriodDays: number;

  @ApiProperty({ description: 'User who created this product', type: () => User })
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_uuid' })
  createdBy?: User;

  @ApiProperty({ description: 'UUID of the user who created this product' })
  @Column({ nullable: true, name: 'created_by_uuid' })
  createdByUuid?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}