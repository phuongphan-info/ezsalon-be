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
import { Role } from '../../roles/entities/role.entity';

export const USER_TABLE_NAME = 'users';

export enum USER {
  STATUS_ACTIVED = 'ACTIVED',
  STATUS_INACTIVED = 'INACTIVED',
  STATUS_PENDING = 'PENDING',
}

@Entity(USER_TABLE_NAME)
export class User {
  static readonly STATUS = {
    ACTIVED: 'ACTIVED',
    INACTIVED: 'INACTIVED',
    PENDING: 'PENDING',
  } as const;

  @ApiProperty({ description: 'User ID' })
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Email address' })
  @Expose()
  @Column({ unique: true, name: 'email_address' })
  email: string;

  @ApiProperty({ description: 'Full name' })
  @Expose()
  @Column({ name: 'full_name' })
  name: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  password: string;

  @ApiProperty({ description: 'Phone number' })
  @Expose()
  @Column({ nullable: true, name: 'phone_number' })
  phone: string;

  @ApiProperty({ description: 'User role', type: () => Role })
  @Expose()
  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_uuid' })
  role: Role;

  @ApiProperty({ description: 'Profile avatar URL' })
  @Expose()
  @Column({ nullable: true, name: 'avatar_url' })
  avatar: string;

  @ApiProperty({
    description: 'Account status',
    enum: [USER.STATUS_ACTIVED, USER.STATUS_INACTIVED, USER.STATUS_PENDING],
    example: USER.STATUS_ACTIVED,
  })
  @Expose()
  @Column({ default: USER.STATUS_ACTIVED })
  status: string;

  @ApiProperty({
    description: 'User who created this user',
    type: () => User,
    required: false,
  })
  @Expose()
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_uuid' })
  createdBy?: User;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
