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

export const STRIPE_TABLE_NAME = 'stripes';

@Entity(STRIPE_TABLE_NAME)
@Index(['stripeCustomerUuid'], { unique: true })
@Index(['customerUuid'])
export class Stripe {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'stripe_customer_uuid', type: 'varchar', length: 255 })
  stripeCustomerUuid: string;

  @Column({ name: 'customer_uuid', type: 'uuid' })
  customerUuid: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_uuid' })
  customer: Customer;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}