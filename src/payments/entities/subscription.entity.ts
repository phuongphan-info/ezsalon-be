import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Plan } from '../../plans/entities/plan.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Salon } from '../../salons/entities/salon.entity';

export const SUBSCRIPTION_TABLE_NAME = 'subscriptions';

export enum SUBSCRIPTION_STATUS {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

@Entity(SUBSCRIPTION_TABLE_NAME)
@Index(['stripeSubscriptionUuid'], { unique: true })
@Index(['customerUuid'])
@Index(['planUuid'])
@Index(['status'])
@Index(['salonUuid'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  // Stripe identifiers
  @Column({ name: 'stripe_subscription_uuid', unique: true })
  stripeSubscriptionUuid: string;

  // Relationship to subscribed plan
  @Column({ name: 'plan_uuid', type: 'uuid' })
  planUuid: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'plan_uuid' })
  plan: Plan;

  @Column({ name: 'customer_uuid', type: 'uuid' })
  customerUuid: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_uuid' })
  customer: Customer;

  @Column({ name: 'salon_uuid', type: 'varchar', length: 36, nullable: true, unique: true })
  salonUuid?: string | null;

  @ManyToOne(() => Salon, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salon_uuid' })
  salon?: Salon | null;

  @Column({ name: 'current_period_start_at', type: 'datetime', nullable: true })
  currentPeriodStartAt?: Date | null;

  @Column({ name: 'current_period_end_at', type: 'datetime', nullable: true })
  currentPeriodEndAt?: Date | null;

  @Column({ name: 'trial_start_at', type: 'datetime', nullable: true })
  trialStartAt?: Date | null;

  @Column({ name: 'trial_end_at', type: 'datetime', nullable: true })
  trialEndAt?: Date | null;

  @Column({ name: 'cancel_at', type: 'datetime', nullable: true })
  cancelAt?: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'canceled_at', type: 'datetime', nullable: true })
  canceledAt?: Date | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'latest_invoice_id', type: 'varchar', length: 255, nullable: true })
  latestInvoiceId?: string | null;

  @Column({
    type: 'enum',
    enum: SUBSCRIPTION_STATUS,
    default: SUBSCRIPTION_STATUS.INCOMPLETE,
  })
  status: SUBSCRIPTION_STATUS;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  get isActive(): boolean {
    return this.status === SUBSCRIPTION_STATUS.ACTIVE;
  }

  get isTrialing(): boolean {
    return this.status === SUBSCRIPTION_STATUS.TRIALING;
  }

  get isCanceled(): boolean {
    return this.status === SUBSCRIPTION_STATUS.CANCELED;
  }

  get isPastDue(): boolean {
    return this.status === SUBSCRIPTION_STATUS.PAST_DUE;
  }

  get hasActiveAccess(): boolean {
    return [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.TRIALING,
    ].includes(this.status);
  }
}