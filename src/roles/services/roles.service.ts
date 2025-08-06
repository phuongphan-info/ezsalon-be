import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  UpdateRoleDto,
} from '../dto/role.dto';
import { Permission } from '../entities/permission.entity';
import { Role, ROLE_TABLE_NAME } from '../entities/role.entity';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all role-related caches including related entities
   */
  private async clearRoleCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(ROLE_TABLE_NAME);
  }

  async create(createRoleDto: CreateRoleDto, currentUserId?: string): Promise<Role> {
    const { permissionNames, ...roleData } = createRoleDto;

    // If permissions are being assigned, validate that user has roles:assign-permissions
    if (permissionNames && permissionNames.length > 0 && currentUserId) {
      const hasAssignPermission = await this.hasPermission(
        currentUserId,
        'roles:assign-permissions',
      );
      if (!hasAssignPermission) {
        throw new ForbiddenException(
          'roles:assign-permissions permission required to assign permissions to roles',
        );
      }
    }

    // Check if role name already exists
    const existingRole = await this.roleRepository.findOne({
      where: { name: roleData.name },
    });

    if (existingRole) {
      throw new ConflictException('Role name already exists');
    }

    const role = this.roleRepository.create(roleData);

    // Assign permissions if provided
    if (permissionNames && permissionNames.length > 0) {
      const permissions = await this.permissionRepository.find({
        where: { name: In(permissionNames) },
      });
      role.permissions = permissions;
    }

    const savedRole = await this.roleRepository.save(role);
    
    // Clear cache after create
    await this.clearRoleCaches();
    
    return savedRole;
  }

  async findAll(): Promise<Role[]> {
    return await this.cacheService.caching(
      ROLE_TABLE_NAME,
      'all',
      async () => {
        return await this.roleRepository.find({
          relations: ['permissions'],
          order: { createdAt: 'ASC' },
        });
      }
    );
  }

  async findOne(id: string): Promise<Role> {
    return await this.cacheService.caching(
      ROLE_TABLE_NAME,
      { id },
      async () => {
        const role = await this.roleRepository.findOne({
          where: { uuid: id },
          relations: ['permissions', 'users'],
        });

        if (!role) {
          throw new NotFoundException('Role not found');
        }

        return role;
      }
    );
  }

  async findByName(name: string): Promise<Role | null> {
    return await this.cacheService.caching(
      ROLE_TABLE_NAME,
      { name },
      async () => {
        return await this.roleRepository.findOne({
          where: { name },
          relations: ['permissions'],
        });
      }
    );
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, currentUserId?: string): Promise<Role> {
    const { permissionNames, ...roleData } = updateRoleDto;

    // If permissions are being assigned, validate that user has roles:assign-permissions
    if (permissionNames !== undefined && currentUserId) {
      const hasAssignPermission = await this.hasPermission(
        currentUserId,
        'roles:assign-permissions',
      );
      if (!hasAssignPermission) {
        throw new ForbiddenException(
          'roles:assign-permissions permission required to assign permissions to roles',
        );
      }
    }

    const role = await this.findOne(id);

    // Update role data
    Object.assign(role, roleData);

    // Update permissions if provided
    if (permissionNames !== undefined) {
      if (permissionNames.length > 0) {
        const permissions = await this.permissionRepository.find({
          where: { name: In(permissionNames) },
        });
        role.permissions = permissions;
      } else {
        role.permissions = [];
      }
    }

    const updatedRole = await this.roleRepository.save(role);
    
    // Clear cache after update
    await this.clearRoleCaches();
    
    return updatedRole;
  }

  async assignPermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<Role> {
    const role = await this.findOne(id);
    const permissions = await this.permissionRepository.find({
      where: { name: In(assignPermissionsDto.permissionNames) },
    });

    role.permissions = permissions;
    const updatedRole = await this.roleRepository.save(role);
    
    // Clear cache after update
    await this.clearRoleCaches();
    
    return updatedRole;
  }

  async removePermission(roleId: string, permissionId: string): Promise<Role> {
    const role = await this.findOne(roleId);
    role.permissions = role.permissions.filter(
      (permission) => permission.uuid !== permissionId,
    );
    const updatedRole = await this.roleRepository.save(role);
    
    // Clear cache after update
    await this.clearRoleCaches();
    
    return updatedRole;
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    // Check if role has users assigned
    if (role.users && role.users.length > 0) {
      throw new ConflictException('Cannot delete role with assigned users');
    }

    await this.roleRepository.remove(role);
    
    // Clear cache after delete
    await this.clearRoleCaches();
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    return await this.cacheService.caching(
      ROLE_TABLE_NAME,
      { userPermissions: userId },
      async () => {
        const result = await this.roleRepository
          .createQueryBuilder('role')
          .leftJoinAndSelect('role.permissions', 'permission')
          .leftJoin('role.users', 'user')
          .where('user.uuid = :userId', { userId })
          .getOne();

        return result?.permissions || [];
      }
    );
  }

  async hasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some((permission) => permission.name === permissionName);
  }

  async hasPermissions(
    userId: string,
    permissionNames: string[],
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const userPermissionNames = permissions.map(
      (permission) => permission.name,
    );

    return permissionNames.every((permissionName) =>
      userPermissionNames.includes(permissionName),
    );
  }
}
