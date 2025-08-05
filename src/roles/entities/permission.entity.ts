import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @ApiProperty({ description: 'Permission ID' })
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @ApiProperty({ description: 'Permission name (unique identifier)' })
  @Column({ unique: true, name: 'permission_name' })
  name!: string;

  @ApiProperty({ description: 'Permission display name' })
  @Column({ name: 'display_name' })
  displayName!: string;

  @ApiProperty({ description: 'Permission description' })
  @Column({ nullable: true, name: 'permission_description' })
  description!: string;

  @ApiProperty({ description: 'Permission resource (e.g., users, bookings)' })
  @Column({ name: 'resource_type' })
  resource!: string;

  @ApiProperty({ description: 'Permission action (e.g., create, read, update, delete)' })
  @Column({ name: 'action_type' })
  action!: string;

  @ApiProperty({ description: 'Roles with this permission', type: () => [Role] })
  @ManyToMany(() => Role, role => role.permissions)
  roles!: Role[];

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
