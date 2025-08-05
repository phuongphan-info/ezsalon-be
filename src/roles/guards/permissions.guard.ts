import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PERMISSIONS_OR_KEY } from '../decorators/permissions.decorator';
import { RolesService } from '../services/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissionsOr = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_OR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are required, allow access
    if (!requiredPermissions && !requiredPermissionsOr) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Check AND permissions (all required)
    if (requiredPermissions) {
      const hasAllPermissions = await this.rolesService.hasPermissions(
        user.uuid,
        requiredPermissions,
      );
      if (!hasAllPermissions) {
        return false;
      }
    }

    // Check OR permissions (any required)
    if (requiredPermissionsOr) {
      const userPermissions = await this.rolesService.getUserPermissions(user.uuid);
      const userPermissionNames = userPermissions.map(p => p.name);
      const hasAnyPermission = requiredPermissionsOr.some(permission =>
        userPermissionNames.includes(permission),
      );

      if (!hasAnyPermission) {
        return false;
      }
    }

    return true;
  }
}
