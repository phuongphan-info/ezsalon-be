import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Check if permission name already exists
    const existingPermission = await this.permissionRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new ConflictException('Permission name already exists');
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    return await this.permissionRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return await this.permissionRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return await this.permissionRepository.find({
      where: { resource },
      order: { action: 'ASC' },
    });
  }

  async findOne(uuid: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { uuid },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async findByName(name: string): Promise<Permission | null> {
    return await this.permissionRepository.findOne({
      where: { name },
    });
  }

  async update(uuid: string, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOne(uuid);
    Object.assign(permission, updatePermissionDto);
    return await this.permissionRepository.save(permission);
  }

  async remove(uuid: string): Promise<void> {
    const permission = await this.findOne(uuid);

    // Check if permission is assigned to any roles
    if (permission.roles && permission.roles.length > 0) {
      throw new ConflictException('Cannot delete permission assigned to roles');
    }

    await this.permissionRepository.remove(permission);
  }

  async createBulkPermissions(resources: string[], actions: string[]): Promise<Permission[]> {
    const permissions: Permission[] = [];

    for (const resource of resources) {
      for (const action of actions) {
        const name = `${resource}:${action}`;
        const displayName = `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`;

        // Check if permission already exists
        const existing = await this.findByName(name);
        if (!existing) {
          const permission = this.permissionRepository.create({
            name,
            displayName,
            description: `Allow ${action} operations on ${resource}`,
            resource,
            action,
          });
          permissions.push(await this.permissionRepository.save(permission));
        }
      }
    }

    return permissions;
  }
}
