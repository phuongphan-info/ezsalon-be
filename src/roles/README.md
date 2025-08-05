# Roles and Permissions System

This document explains how to use the dynamic roles and permissions system in the EzSalon application.

## Overview

The system consists of three main entities:

- **Permission**: Defines specific actions (create, read, update, delete) on resources (users, roles, bookings, etc.)
- **Role**: Groups permissions together and can be assigned to users
- **User**: Has a role which determines their permissions

## Key Features

- ✅ **Dynamic Roles**: Roles and permissions are seeded and managed through database
- ✅ **Granular Permissions**: Control access at the resource-action level
- ✅ **Flexible Guards**: Support both AND and OR permission logic
- ✅ **Type Safety**: Full TypeScript support with proper typing
- ✅ **Seeding System**: Comprehensive seeding for permissions, roles, and users
- ✅ **Service Layer**: Programmatic access to roles and permissions without HTTP API

## Usage

### 1. Protecting Routes with Permissions

#### Basic Permission Check (ALL required)

```typescript
import { RequirePermissions } from '../roles/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  @Get()
  @RequirePermissions('users:read')
  async findAll() {
    // Only users with 'users:read' permission can access
  }

  @Post()
  @RequirePermissions('users:create')
  async create() {
    // Only users with 'users:create' permission can access
  }

  @Patch(':id')
  @RequirePermissions('users:update', 'users:read') // Requires BOTH permissions
  async update() {
    // User must have both 'users:update' AND 'users:read' permissions
  }
}
```

#### Any Permission Check (OR logic)

```typescript
import { RequireAnyPermission } from '../roles/decorators/permissions.decorator';

@Controller('bookings')
export class BookingsController {
  @Get()
  @RequireAnyPermission('bookings:read', 'bookings:create')
  async findAll() {
    // Users with EITHER 'bookings:read' OR 'bookings:create' can access
  }
}
```

#### Shorthand Decorators

```typescript
import {
  CanRead,
  CanCreate,
  CanUpdate,
  CanDelete,
  AdminOnly,
} from '../roles/decorators/permissions.decorator';

@Controller('services')
export class ServicesController {
  @Get()
  @CanRead('services') // Shorthand for @RequirePermissions('services:read')
  async findAll() {}

  @Post()
  @CanCreate('services') // Shorthand for @RequirePermissions('services:create')
  async create() {}

  @Delete(':id')
  @AdminOnly() // Requires multiple admin permissions
  async remove() {}
}
```

### 2. Using Permission Helper in Services

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionHelper } from '../roles/helpers/permission.helper';

@Injectable()
export class BookingService {
  constructor(private permissionHelper: PermissionHelper) {}

  async getUserBookings(userId: number, requesterId: number) {
    // Check if requester can view all bookings or only their own
    const canViewAll = await this.permissionHelper.hasPermission(requesterId, 'bookings:read');

    if (canViewAll || userId === requesterId) {
      return this.getBookings(userId);
    }

    throw new ForbiddenException('Cannot view other users bookings');
  }

  async updateBooking(bookingId: number, userId: number, data: any) {
    // Check if user can perform this action
    const canUpdate = await this.permissionHelper.canPerform(userId, 'bookings', 'update');

    if (!canUpdate) {
      throw new ForbiddenException('Cannot update bookings');
    }

    // Update logic here
  }
}
```

### 3. Checking Multiple Permissions

```typescript
// Check if user has ANY of these permissions
const canManageBookings = await this.permissionHelper.hasAnyPermission(userId, [
  'bookings:create',
  'bookings:update',
  'bookings:delete',
]);

// Check if user has ALL of these permissions
const canFullyManageUsers = await this.permissionHelper.hasAllPermissions(userId, [
  'users:create',
  'users:update',
  'users:delete',
]);
```

## Default Roles and Permissions

### Permissions Structure

Permissions follow the pattern: `{resource}:{action}`

**Available Resources:**

- `users` - User management
- `roles` - Role management
- `permissions` - Permission management
- `bookings` - Booking management
- `services` - Service management
- `reports` - Report viewing

**Available Actions:**

- `create` - Create new records
- `read` - View/read records
- `update` - Modify existing records
- `delete` - Remove records

### Default Roles

#### System Administrator (`admin`)

- **Color**: Red (#dc2626)
- **Permissions**: Complete system access
  - All user, role, and permission management
  - All booking and service management
  - Full report access
  - System configuration

#### Salon Owner (`owner`)

- **Color**: Brown (#7c2d12)
- **Permissions**: Business ownership access
  - Full user management (create, read, update, delete)
  - Role viewing and updating
  - Complete booking and service management
  - Full report access

#### Salon Manager (`manager`)

- **Color**: Green (#059669)
- **Permissions**: Operational management
  - Read and update users
  - View roles
  - Full booking and service management
  - Report access

#### Salon Staff (`staff`)

- **Color**: Purple (#7c3aed)
- **Permissions**: Staff operational access
  - View users
  - Read and update bookings
  - View services

## Database Seeding

Run the comprehensive seeding script:

```bash
npm run seed:user
```

This will create:

- All permissions for users, roles, permissions, bookings, services, and reports
- Default roles (admin, owner, manager, staff) with appropriate permissions
- Sample users with assigned roles

**Note**: Role and permission management is handled through database seeding rather than HTTP API endpoints. To modify roles or permissions, update the seed data and re-run the seeding script.

### Sample Login Credentials

- **System Admin**: admin@ezsalon.com / admin123
- **Salon Owner**: owner@ezsalon.com / owner123
- **Manager**: manager@ezsalon.com / manager123
- **Staff**: staff1@ezsalon.com / staff123

## Adding New Resources

To add permissions for a new resource (e.g., 'appointments'):

1. **Add permissions to seed data**:

```typescript
// In src/database/seed-data.ts
export const seedPermissions = [
  // ... existing permissions
  {
    name: 'appointments:create',
    displayName: 'Create Appointments',
    resource: 'appointments',
    action: 'create',
  },
  {
    name: 'appointments:read',
    displayName: 'Read Appointments',
    resource: 'appointments',
    action: 'read',
  },
  {
    name: 'appointments:update',
    displayName: 'Update Appointments',
    resource: 'appointments',
    action: 'update',
  },
  {
    name: 'appointments:delete',
    displayName: 'Delete Appointments',
    resource: 'appointments',
    action: 'delete',
  },
];
```

2. **Update role permissions**:

```typescript
// Add to existing roles in seedRoles
{
  name: 'manager',
  // ... other properties
  permissions: [
    // ... existing permissions
    'appointments:create',
    'appointments:read',
    'appointments:update',
    'appointments:delete',
  ],
}
```

3. **Use in controllers**:

```typescript
@Controller('appointments')
export class AppointmentsController {
  @Get()
  @CanRead('appointments')
  async findAll() {}

  @Post()
  @CanCreate('appointments')
  async create() {}
}
```

## Best Practices

1. **Always use guards**: Apply `JwtAuthGuard` and `PermissionsGuard` to protected routes
2. **Granular permissions**: Create specific permissions rather than broad ones
3. **Use helper methods**: Leverage `PermissionHelper` for complex permission checks
4. **Consistent naming**: Follow `{resource}:{action}` pattern for permission names
5. **Document permissions**: Keep track of what each permission allows
6. **Test permissions**: Verify permission checks work correctly for each role

## Security Notes

- Users must be authenticated (valid JWT token) before permission checks
- Permission checks happen after authentication
- Database relationships ensure data integrity
- Inactive roles/permissions are automatically filtered out
- Failed permission checks return 403 Forbidden responses
