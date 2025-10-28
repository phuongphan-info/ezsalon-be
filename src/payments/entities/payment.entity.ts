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
import { Customer } from 'src/customers/entities/customer.entity';
import { Subscription } from './subscription.entity';

export const PAYMENT_TABLE_NAME = 'payments';

export enum PAYMENT_STATUS {
  PAID = 'paid',
  UNPAID = 'unpaid',
  VOID = 'void',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity(PAYMENT_TABLE_NAME)
@Index(['stripePaymentIntentUuid'], { unique: true })
@Index(['stripeInvoiceUuid'])
@Index(['customerUuid'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_uuid', type: 'char', length: 36 })
  customerUuid: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_uuid' })
  customer: Customer;

  @Column({ name: 'subscription_uuid', type: 'char', length: 36, nullable: true })
  subscriptionUuid?: string | null;

  @ManyToOne(() => Subscription, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscription_uuid' })
  subscription?: Subscription | null;

  @Column({ name: 'stripe_invoice_uuid', type: 'varchar', length: 255 })
  stripeInvoiceUuid: string;

  @Column({ name: 'stripe_payment_intent_uuid', type: 'varchar', length: 255 })
  stripePaymentIntentUuid: string;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 10, scale: 2 })
  amountPaid: string;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'usd' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PAYMENT_STATUS,
    default: PAYMENT_STATUS.PENDING,
  })
  status: PAYMENT_STATUS;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
