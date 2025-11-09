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
import { SocialAccount } from '../../auth/entities/social-account.entity';
import { User } from '../../users/entities/user.entity';
import { CustomerSalon } from './customer-salon.entity';

export const CUSTOMER_TABLE_NAME = 'customers';

export enum GENDER {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum CUSTOMER_STATUS {
  ACTIVED = 'ACTIVED',
  INACTIVED = 'INACTIVED',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
}

@Entity(CUSTOMER_TABLE_NAME)
export class Customer {
  constructor(partial?: Partial<Customer>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ unique: true, name: 'email_address' })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'full_name' })
  name: string;

  @Column({ nullable: true, unique: true, name: 'phone_number' })
  phone?: string;

  @Column({ nullable: true, name: 'date_of_birth', type: 'date' })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true, name: 'customer_address' })
  address?: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatar?: string;

  @Column({ nullable: true, name: 'customer_notes', type: 'text' })
  notes?: string;

  @Column({ default: CUSTOMER_STATUS.PENDING })
  status: string;

  @Column({ default: false, name: 'is_owner' })
  isOwner: boolean;

  @Column({ nullable: true, name: 'created_by_uuid' })
  createdByUuid?: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'created_by_uuid' })
  createdBy?: Customer;

  @Column({ nullable: true, name: 'created_by_user_uuid' })
  createdByUserUuid?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'created_by_user_uuid' })
  createdByUser?: User;

  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.customer, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  socialAccounts: SocialAccount[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CustomerSalon, (customerSalon) => customerSalon.customer, { eager: true })
  customerSalons?: CustomerSalon[];
}
