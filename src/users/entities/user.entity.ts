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
import { Role } from '../../roles/entities/role.entity';

export enum USER {
  STATUS_ACTIVED = 'ACTIVED',
  STATUS_INACTIVED = 'INACTIVED',
  STATUS_PENDING = 'PENDING',
}

@Entity('users')
export class User {
  static readonly STATUS = {
    ACTIVED: 'ACTIVED',
    INACTIVED: 'INACTIVED',
    PENDING: 'PENDING',
  } as const;

  @ApiProperty({ description: 'User ID' })
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Email address' })
  @Column({ unique: true, name: 'email_address' })
  email: string;

  @ApiProperty({ description: 'Full name' })
  @Column({ name: 'full_name' })
  name: string;

  @Column({ name: 'password_hash' })
  password: string;

  @ApiProperty({ description: 'Phone number' })
  @Column({ nullable: true, name: 'phone_number' })
  phone: string;

  @ApiProperty({ description: 'User role', type: () => Role })
  @ManyToOne(() => Role, role => role.users, { eager: true })
  @JoinColumn({ name: 'role_uuid' })
  role: Role;

  @ApiProperty({ description: 'Profile avatar URL' })
  @Column({ nullable: true, name: 'avatar_url' })
  avatar: string;

  @ApiProperty({
    description: 'Account status',
    enum: [USER.STATUS_ACTIVED, USER.STATUS_INACTIVED, USER.STATUS_PENDING],
    example: USER.STATUS_ACTIVED,
  })
  @Column({ default: USER.STATUS_ACTIVED })
  status: string;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
