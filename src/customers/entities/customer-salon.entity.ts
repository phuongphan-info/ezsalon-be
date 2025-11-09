import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Salon } from '../../salons/entities/salon.entity';

export const CUSTOMER_SALON_TABLE_NAME = 'customer_salons';

export enum CUSTOMER_SALON_ROLE {
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  FRONT_DESK = 'FRONT_DESK',
  STAFF = 'STAFF',
}

@Entity(CUSTOMER_SALON_TABLE_NAME)
export class CustomerSalon {
  @ApiProperty({ description: 'Customer Salon relationship UUID' })
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Customer UUID' })
  @Column({ name: 'customer_uuid' })
  customerUuid: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_uuid' })
  customer: Customer;

  @ApiProperty({ description: 'Salon UUID' })
  @Column({ name: 'salon_uuid' })
  salonUuid: string;

  @ManyToOne(() => Salon, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'salon_uuid' })
  salon: Salon;

  @ApiProperty({
    description: 'Customer role in this salon',
    enum: [
      CUSTOMER_SALON_ROLE.OWNER,
      CUSTOMER_SALON_ROLE.MANAGER,
      CUSTOMER_SALON_ROLE.FRONT_DESK,
      CUSTOMER_SALON_ROLE.STAFF,
    ],
    example: CUSTOMER_SALON_ROLE.STAFF,
  })
  @Column({ name: 'role_name' })
  roleName: string;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
