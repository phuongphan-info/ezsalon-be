import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignPermissionsDto, CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { permissionIds, ...roleData } = createRoleDto;

    // Check if role name already exists
    const existingRole = await this.roleRepository.findOne({
      where: { name: roleData.name },
    });

    if (existingRole) {
      throw new ConflictException('Role name already exists');
    }

    const role = this.roleRepository.create(roleData);

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findByIds(permissionIds);
      role.permissions = permissions;
    }

    return await this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      relations: ['permissions'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { uuid: id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const { permissionIds, ...roleData } = updateRoleDto;

    const role = await this.findOne(id);

    // Update role data
    Object.assign(role, roleData);

    // Update permissions if provided
    if (permissionIds !== undefined) {
      if (permissionIds.length > 0) {
        const permissions = await this.permissionRepository.findByIds(permissionIds);
        role.permissions = permissions;
      } else {
        role.permissions = [];
      }
    }

    return await this.roleRepository.save(role);
  }

  async assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto): Promise<Role> {
    const role = await this.findOne(id);
    const permissions = await this.permissionRepository.findByIds(
      assignPermissionsDto.permissionIds,
    );

    role.permissions = permissions;
    return await this.roleRepository.save(role);
  }

  async removePermission(roleId: string, permissionId: string): Promise<Role> {
    const role = await this.findOne(roleId);
    role.permissions = role.permissions.filter(permission => permission.uuid !== permissionId);
    return await this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    // Check if role has users assigned
    if (role.users && role.users.length > 0) {
      throw new ConflictException('Cannot delete role with assigned users');
    }

    await this.roleRepository.remove(role);
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const result = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoin('role.users', 'user')
      .where('user.uuid = :userId', { userId })
      .andWhere('role.status = :roleStatus', { roleStatus: 'ACTIVED' })
      .andWhere('permission.status = :permissionStatus', { permissionStatus: 'ACTIVED' })
      .getOne();

    return result?.permissions || [];
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(permission => permission.name === permissionName);
  }

  async hasPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const userPermissionNames = permissions.map(permission => permission.name);

    return permissionNames.every(permissionName => userPermissionNames.includes(permissionName));
  }
}
