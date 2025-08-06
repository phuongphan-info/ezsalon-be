import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { SocialAccount } from '../../auth/entities/social-account.entity';
import { User } from '../../users/entities/user.entity';

export const CUSTOMER_TABLE_NAME = 'customers';

export enum CUSTOMER_STATUS {
  ACTIVED = 'ACTIVED',
  INACTIVED = 'INACTIVED',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
}

@Entity(CUSTOMER_TABLE_NAME)
export class Customer {
  @ApiProperty({ description: 'Customer ID' })
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Email address' })
  @Column({ unique: true, name: 'email_address' })
  email: string;

  @ApiHideProperty()
  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ description: 'Full name' })
  @Column({ name: 'full_name' })
  name: string;

  @ApiProperty({ description: 'Phone number' })
  @Column({ nullable: true, unique: true, name: 'phone_number' })
  phone?: string;

  @ApiProperty({ description: 'Date of birth' })
  @Column({ nullable: true, name: 'date_of_birth', type: 'date' })
  dateOfBirth?: Date;

  @ApiProperty({ description: 'Gender' })
  @Column({ nullable: true })
  gender?: string;

  @ApiProperty({ description: 'Address' })
  @Column({ nullable: true, name: 'customer_address' })
  address?: string;

  @ApiProperty({ description: 'Profile avatar URL' })
  @Column({ nullable: true, name: 'avatar_url' })
  avatar?: string;

  @ApiProperty({ description: 'Notes about the customer' })
  @Column({ nullable: true, name: 'customer_notes', type: 'text' })
  notes?: string;

  @ApiProperty({
    description: 'Customer status',
    enum: [CUSTOMER_STATUS.ACTIVED, CUSTOMER_STATUS.PENDING, CUSTOMER_STATUS.INACTIVED, CUSTOMER_STATUS.BLOCKED],
    example: CUSTOMER_STATUS.PENDING,
  })
  @Column({ default: CUSTOMER_STATUS.PENDING })
  status: string;

  @ApiProperty({ description: 'Whether this customer is an owner (can create salons)' })
  @Column({ default: false, name: 'is_owner' })
  isOwner: boolean;

  @ApiProperty({ description: 'UUID of the customer who created this customer record' })
  @Column({ nullable: true, name: 'created_by_uuid' })
  createdByUuid?: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'created_by_uuid' })
  createdBy?: Customer;

  @ApiProperty({ description: 'UUID of the user who created this customer record' })
  @Column({ nullable: true, name: 'created_by_user_uuid' })
  createdByUserUuid?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'created_by_user_uuid' })
  createdByUser?: User;


  @ApiProperty({ description: 'Social accounts linked to this customer' })
  @Expose()
  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  socialAccounts: SocialAccount[];

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
