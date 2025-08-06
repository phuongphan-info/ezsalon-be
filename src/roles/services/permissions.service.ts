import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from '../dto/permission.dto';
import { Permission, PERMISSION_TABLE_NAME } from '../entities/permission.entity';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all permission-related caches including related entities
   */
  private async clearPermissionCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(PERMISSION_TABLE_NAME);
  }

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Check if permission name already exists
    const existingPermission = await this.permissionRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new ConflictException('Permission name already exists');
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    const savedPermission = await this.permissionRepository.save(permission);
    
    // Clear cache after create
    await this.clearPermissionCaches();
    
    return savedPermission;
  }

  async findAll(): Promise<Permission[]> {
    return await this.cacheService.caching(
      PERMISSION_TABLE_NAME,
      'all',
      async () => {
        return await this.permissionRepository.find({
          order: { resource: 'ASC', action: 'ASC' },
        });
      }
    );
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return await this.cacheService.caching(
      PERMISSION_TABLE_NAME,
      { resource },
      async () => {
        return await this.permissionRepository.find({
          where: { resource },
          order: { action: 'ASC' },
        });
      }
    );
  }

  async findOne(uuid: string): Promise<Permission> {
    return await this.cacheService.caching(
      PERMISSION_TABLE_NAME,
      { id: uuid },
      async () => {
        const permission = await this.permissionRepository.findOne({
          where: { uuid },
          relations: ['roles'],
        });

        if (!permission) {
          throw new NotFoundException('Permission not found');
        }

        return permission;
      }
    );
  }

  async findByName(name: string): Promise<Permission | null> {
    return await this.cacheService.caching(
      PERMISSION_TABLE_NAME,
      { name },
      async () => {
        return await this.permissionRepository.findOne({
          where: { name },
        });
      }
    );
  }

  async update(
    uuid: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOne(uuid);
    Object.assign(permission, updatePermissionDto);
    const updatedPermission = await this.permissionRepository.save(permission);
    
    // Clear cache after update
    await this.clearPermissionCaches();
    
    return updatedPermission;
  }

  async remove(uuid: string): Promise<void> {
    const permission = await this.findOne(uuid);

    // Check if permission is assigned to any roles
    if (permission.roles && permission.roles.length > 0) {
      throw new ConflictException('Cannot delete permission assigned to roles');
    }

    await this.permissionRepository.remove(permission);
    
    // Clear cache after delete
    await this.clearPermissionCaches();
  }

  async createBulkPermissions(
    resources: string[],
    actions: string[],
  ): Promise<Permission[]> {
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
