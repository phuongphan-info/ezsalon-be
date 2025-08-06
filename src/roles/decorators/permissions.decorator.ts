import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_OR_KEY = 'permissions_or';

/**
 * Requires ALL specified permissions (AND logic)
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Requires ANY of the specified permissions (OR logic)
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_OR_KEY, permissions);

/**
 * Shorthand for common resource-action permissions
 */
export const CanCreate = (resource: string) =>
  RequirePermissions(`${resource}:create`);
export const CanRead = (resource: string) =>
  RequirePermissions(`${resource}:read`);
export const CanUpdate = (resource: string) =>
  RequirePermissions(`${resource}:update`);
export const CanDelete = (resource: string) =>
  RequirePermissions(`${resource}:delete`);

/**
 * Admin only access
 */
export const AdminOnly = () =>
  RequirePermissions('users:create', 'users:delete', 'roles:create');
