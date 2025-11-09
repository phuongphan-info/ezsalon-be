import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export const PLAN_TABLE_NAME = 'plans';

export enum PLAN_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export enum PLAN_TYPE {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_TIME = 'ONE_TIME',
}

export enum BILLING_INTERVAL {
  MONTH = 'month',
  YEAR = 'year',
}

@Index(['name', 'billingInterval', 'billingIntervalCount'], {
  unique: true,
})
@Entity(PLAN_TABLE_NAME)
export class Plan {
  constructor(partial?: Partial<Plan>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'plan_name' })
  name: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'enum', enum: PLAN_STATUS, default: PLAN_STATUS.DRAFT, name: 'status' })
  status: PLAN_STATUS;

  @Column({ type: 'enum', enum: PLAN_TYPE, default: PLAN_TYPE.SUBSCRIPTION, name: 'type' })
  type: PLAN_TYPE;

  @Column({ type: 'int', name: 'price_cents' })
  priceCents: number;

  @Column({ length: 3, default: 'USD', name: 'currency' })
  currency: string;

  @Column({ type: 'enum', enum: BILLING_INTERVAL, default: BILLING_INTERVAL.MONTH, name: 'billing_interval' })
  billingInterval: BILLING_INTERVAL;

  @Column({ type: 'int', default: 1, name: 'billing_interval_count' })
  billingIntervalCount: number;

  @Column({ nullable: true, name: 'stripe_plan_id' })
  stripePlanId?: string;

  @Column({ nullable: true, name: 'stripe_price_id' })
  stripePriceId?: string;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder: number;

  @Column({ type: 'int', default: 7, name: 'trial_period_days' })
  trialPeriodDays: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_uuid' })
  createdBy?: User;

  @Column({ nullable: true, name: 'created_by_uuid' })
  createdByUuid?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}