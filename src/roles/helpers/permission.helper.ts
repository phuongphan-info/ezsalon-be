import { Injectable } from '@nestjs/common';
import { RolesService } from '../services/roles.service';

@Injectable()
export class PermissionHelper {
  constructor(private rolesService: RolesService) {}

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    return await this.rolesService.hasPermission(userId, permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.rolesService.getUserPermissions(userId);
    const userPermissionNames = userPermissions.map(p => p.name);

    return permissions.some(permission => userPermissionNames.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    return await this.rolesService.hasPermissions(userId, permissions);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string) {
    return await this.rolesService.getUserPermissions(userId);
  }

  /**
   * Check if user can perform action on resource
   */
  async canPerform(userId: string, resource: string, action: string): Promise<boolean> {
    const permissionName = `${resource}:${action}`;
    return await this.hasPermission(userId, permissionName);
  }
}
