import { Injectable } from '@nestjs/common';
import { RolesService } from '../services/roles.service';

@Injectable()
export class PermissionHelper {
  constructor(private rolesService: RolesService) {}

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userUuid: string, permission: string): Promise<boolean> {
    return await this.rolesService.hasPermission(userUuid, permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userUuid: string,
    permissions: string[],
  ): Promise<boolean> {
    const userPermissions = await this.rolesService.getUserPermissions(userUuid);
    const userPermissionNames = userPermissions.map((p) => p.name);

    return permissions.some((permission) =>
      userPermissionNames.includes(permission),
    );
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    userUuid: string,
    permissions: string[],
  ): Promise<boolean> {
    return await this.rolesService.hasPermissions(userUuid, permissions);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userUuid: string) {
    return await this.rolesService.getUserPermissions(userUuid);
  }

  /**
   * Check if user can perform action on resource
   */
  async canPerform(
    userUuid: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const permissionName = `${resource}:${action}`;
    return await this.hasPermission(userUuid, permissionName);
  }
}
