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
import { Exclude, Expose } from 'class-transformer';
import { Customer } from '../../customers/entities/customer.entity';

export const SOCIAL_ACCOUNT_TABLE_NAME = 'social_accounts';

export enum SOCIAL_PROVIDER {
  APPLE = 'apple',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
  TWITTER = 'twitter',
}

@Entity(SOCIAL_ACCOUNT_TABLE_NAME)
export class SocialAccount {
  @ApiProperty({ description: 'Social Account ID' })
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Social provider ID' })
  @Expose()
  @Column({ name: 'social_uuid' })
  socialUuid: string;

  @ApiProperty({ 
    description: 'Social provider name',
    enum: [SOCIAL_PROVIDER.GOOGLE, SOCIAL_PROVIDER.FACEBOOK, SOCIAL_PROVIDER.GITHUB, SOCIAL_PROVIDER.TWITTER],
    example: SOCIAL_PROVIDER.GOOGLE,
  })
  @Expose()
  @Column({ name: 'social_name' })
  socialName: string;

  @ApiProperty({ description: 'Email from social provider' })
  @Expose()
  @Column({ name: 'social_email' })
  email: string;

  @ApiProperty({ description: 'Full name from social provider' })
  @Expose()
  @Column({ name: 'social_name_display', nullable: true })
  displayName: string;

  @ApiProperty({ description: 'Profile picture URL from social provider' })
  @Expose()
  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @ApiProperty({ description: 'Raw profile data from social provider' })
  @Exclude()
  @Column({ type: 'json', nullable: true, name: 'profile_data' })
  profileData: any;

  @ApiProperty({ description: 'Associated customer', type: () => Customer })
  @Expose()
  @ManyToOne(() => Customer, (customer) => customer.socialAccounts, { eager: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_uuid' })
  customer: Customer;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
