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

export const USER_TABLE_NAME = 'users';

export enum USER {
  STATUS_ACTIVED = 'ACTIVED',
  STATUS_INACTIVED = 'INACTIVED',
  STATUS_PENDING = 'PENDING',
}

@Entity(USER_TABLE_NAME)
export class User {
  constructor(partial?: Partial<User>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ unique: true, name: 'email_address' })
  email: string;

  @Column({ name: 'full_name' })
  name: string;

  @Column({ name: 'password_hash' })
  password: string;

  @Column({ nullable: true, name: 'phone_number' })
  phone: string;

  @Column({ name: 'role_uuid' })
  roleUuid: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_uuid' })
  role: Role;

  @Column({ nullable: true, name: 'avatar_url' })
  avatar: string;
  
  @Column({ default: USER.STATUS_ACTIVED })
  status: string;

  @Column({ nullable: true, name: 'created_by_uuid' })
  createdByUuid: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_uuid' })
  createdBy?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
