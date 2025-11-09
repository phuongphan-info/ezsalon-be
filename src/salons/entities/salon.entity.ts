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
import { Customer } from '../../customers/entities/customer.entity';

export const SALON_TABLE_NAME = 'salons';

export enum SALON_STATUS {
  ACTIVED = 'ACTIVED',
  INACTIVED = 'INACTIVED',
}

@Entity(SALON_TABLE_NAME)
export class Salon {
  @ApiProperty({ description: 'Salon UUID' })
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @ApiProperty({ description: 'Salon name' })
  @Column({ name: 'salon_name' })
  name!: string;

  @ApiProperty({ description: 'Salon description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Salon address' })
  @Column({ name: 'salon_address', nullable: true })
  address?: string;

  @ApiProperty({ description: 'Salon phone number' })
  @Column({ name: 'phone_number', nullable: true })
  phone?: string;

  @ApiProperty({ description: 'Salon email' })
  @Column({ name: 'email_address', unique: true, nullable: true })
  email?: string;

  @ApiProperty({ description: 'Business hours' })
  @Column({ name: 'business_hours', type: 'json', nullable: true })
  businessHours?: Record<string, any>;

  @ApiProperty({ description: 'Salon website URL' })
  @Column({ name: 'website_url', nullable: true })
  website?: string;

  @ApiProperty({ description: 'Salon logo URL' })
  @Column({ name: 'logo_url', nullable: true })
  logo?: string;

  @ApiProperty({ description: 'Customer UUID (owner)' })
  @Column({ name: 'customer_uuid', nullable: true })
  customerUuid?: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_uuid' })
  customer?: Customer;

  @ApiProperty({
    description: 'Salon status',
    enum: [SALON_STATUS.ACTIVED, SALON_STATUS.INACTIVED],
    example: SALON_STATUS.ACTIVED,
  })
  @Column({ default: SALON_STATUS.ACTIVED })
  status!: string;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
