import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @ApiProperty({ description: 'Role ID' })
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ApiProperty({ description: 'Role name' })
  @Column({ unique: true, name: 'role_name' })
  name: string;

  @ApiProperty({ description: 'Role display name' })
  @Column({ name: 'display_name' })
  displayName: string;

  @ApiProperty({ description: 'Role description' })
  @Column({ nullable: true, name: 'role_description' })
  description: string;

  @ApiProperty({ description: 'Role color for UI' })
  @Column({ nullable: true, name: 'ui_color' })
  color: string;

  @ApiProperty({ description: 'Role permissions', type: () => [Permission] })
  @ManyToMany(() => Permission, permission => permission.roles, {
    cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_uuid', referencedColumnName: 'uuid' },
    inverseJoinColumn: { name: 'permission_uuid', referencedColumnName: 'uuid' },
  })
  permissions: Permission[];

  @ApiProperty({ description: 'Users with this role', type: () => [User] })
  @OneToMany(() => User, user => user.role)
  users: User[];

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
