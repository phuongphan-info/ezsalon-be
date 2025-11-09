import { Permission } from '../roles/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AppDataSource } from './data-source';
import { resolveDatabaseConfig } from './database-env.util';

const { useTest } = resolveDatabaseConfig();

export const seedPermissions = [
  // users
  {
    name: 'users:create',
    displayName: 'Create Users',
    description: 'Create new users',
    resource: 'users',
    action: 'create',
  },
  {
    name: 'users:read',
    displayName: 'Read Users',
    description: 'View user information created by the logged user',
    resource: 'users',
    action: 'read',
  },
  {
    name: 'users:read-all',
    displayName: 'Read All Users',
    description: 'View all users in the system',
    resource: 'users',
    action: 'read-all',
  },
  {
    name: 'users:update',
    displayName: 'Update Users',
    description: 'Update user information created by the logged user',
    resource: 'users',
    action: 'update',
  },
  {
    name: 'users:update-all',
    displayName: 'Update All Users',
    description: 'Update any user in the system',
    resource: 'users',
    action: 'update-all',
  },
  {
    name: 'users:delete',
    displayName: 'Delete Users',
    description: 'Delete users created by the logged user',
    resource: 'users',
    action: 'delete',
  },
  {
    name: 'users:delete-all',
    displayName: 'Delete All Users',
    description: 'Delete any user in the system',
    resource: 'users',
    action: 'delete-all',
  },

  // roles
  {
    name: 'roles:create',
    displayName: 'Create Roles',
    description: 'Create new roles',
    resource: 'roles',
    action: 'create',
  },
  {
    name: 'roles:read',
    displayName: 'Read Roles',
    description: 'View role information',
    resource: 'roles',
    action: 'read',
  },
  {
    name: 'roles:update',
    displayName: 'Update Roles',
    description: 'Update role information',
    resource: 'roles',
    action: 'update',
  },
  {
    name: 'roles:delete',
    displayName: 'Delete Roles',
    description: 'Delete roles',
    resource: 'roles',
    action: 'delete',
  },
  {
    name: 'roles:assign-permissions',
    displayName: 'Assign Permissions to Roles',
    description: 'Assign permissions to roles',
    resource: 'roles',
    action: 'assign-permissions',
  },

  // permissions
  {
    name: 'permissions:read',
    displayName: 'Read Permissions',
    description: 'View permissions in the system',
    resource: 'permissions',
    action: 'read',
  },

  // customer
  {
    name: 'customers:create',
    displayName: 'Create Customers',
    description: 'Create new customers',
    resource: 'customers',
    action: 'create',
  },
  {
    name: 'customers:read',
    displayName: 'Read Customers',
    description: 'View customer information created by the logged user',
    resource: 'customers',
    action: 'read',
  },
  {
    name: 'customers:read-all',
    displayName: 'Read All Customers',
    description: 'View all customers in the system',
    resource: 'customers',
    action: 'read-all',
  },
  {
    name: 'customers:update',
    displayName: 'Update Customers',
    description: 'Update customer information created by the logged user',
    resource: 'customers',
    action: 'update',
  },
  {
    name: 'customers:update-all',
    displayName: 'Update All Customers',
    description: 'Update any customer in the system',
    resource: 'customers',
    action: 'update-all',
  },
  {
    name: 'customers:delete',
    displayName: 'Delete Customers',
    description: 'Delete customers created by the logged user',
    resource: 'customers',
    action: 'delete',
  },
  {
    name: 'customers:delete-all',
    displayName: 'Delete All Customers',
    description: 'Delete any customer in the system',
    resource: 'customers',
    action: 'delete-all',
  },

  // plans
  {
    name: 'plans:create',
    displayName: 'Create Plans',
    description: 'Create new subscription plans/plans',
    resource: 'plans',
    action: 'create',
  },
  {
    name: 'plans:read',
    displayName: 'Read Plans',
    description: 'View plan information',
    resource: 'plans',
    action: 'read',
  },
  {
    name: 'plans:read-all',
    displayName: 'Read All Plans',
    description: 'View all plans in the system',
    resource: 'plans',
    action: 'read-all',
  },
  {
    name: 'plans:update',
    displayName: 'Update Plans',
    description: 'Update plan information',
    resource: 'plans',
    action: 'update',
  },
  {
    name: 'plans:update-all',
    displayName: 'Update All Plans',
    description: 'Update any plan in the system',
    resource: 'plans',
    action: 'update-all',
  },
  {
    name: 'plans:delete',
    displayName: 'Delete Plans',
    description: 'Delete plans',
    resource: 'plans',
    action: 'delete',
  },
  {
    name: 'plans:delete-all',
    displayName: 'Delete All Plans',
    description: 'Delete any plan in the system',
    resource: 'plans',
    action: 'delete-all',
  },
];

export const seedRoles = [
  {
    name: 'admin',
    displayName: 'System Administrator',
    description: 'Full system access and management',
    color: '#dc2626',
    permissions: [
      'users:create',
      'users:read',
      'users:read-all',
      'users:update',
      'users:update-all',
      'users:delete',
      'users:delete-all',
      'roles:create',
      'roles:read',
      'roles:update',
      'roles:delete',
      'roles:assign-permissions',
      'permissions:read',
      'customers:create',
      'customers:read-all',
      'customers:update-all',
      'customers:delete-all',
      'plans:create',
      'plans:read',
      'plans:read-all',
      'plans:update',
      'plans:update-all',
      'plans:delete',
      'plans:delete-all',
    ],
  },
  {
    name: 'moderator',
    displayName: 'Moderator',
    description: 'System management with limited user administration privileges',
    color: '#2563eb',
    permissions: [
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'roles:create',
      'roles:read',
      'roles:update',
      'roles:delete',
      'roles:assign-permissions',
      'permissions:read',
      'customers:create',
      'customers:read',
      'customers:update',
      'customers:delete',
      'plans:create',
      'plans:read',
      'plans:update',
      'plans:delete',
    ],
  },
];

async function seedPermissionsAndRoles(
  shouldInitializeDb = true,
  shouldCloseDb = true,
) {
  try {
    if(!useTest) {
      console.log('🌱 Starting permissions and roles seeding (reset mode)...');
    }

    // Initialize the data source only if requested
    if (shouldInitializeDb) {
      await AppDataSource.initialize();
      if(!useTest) {
        console.log('✅ Database connection established');
      }
    }

    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const userRepository = AppDataSource.getRepository(User);

    // 1. Clear existing permissions and roles (reset mode)
    if(!useTest) {
      console.log('🗑️  Clearing existing roles and permissions...');
    }

    // We need to handle foreign key constraints properly
    // First, find and remove all users that reference roles
    // Break self-referential created_by_uuid foreign key references to allow deletion
    // This avoids ER_ROW_IS_REFERENCED_2 errors when a user is the creator of other users.
    await userRepository
      .createQueryBuilder()
      .update(User)
      .set({ createdBy: null })
      .where('created_by_uuid IS NOT NULL')
      .execute();

    const existingUsers = await userRepository.find();
    if (existingUsers.length > 0) {
      await userRepository.remove(existingUsers);
      if(!useTest) {
        console.log('✅ Cleared all existing users (to remove role references)');
      }
    }

    // Then clear role-permission relationships by finding and removing roles with relations
    const existingRoles = await roleRepository.find({
      relations: ['permissions'],
    });
    if (existingRoles.length > 0) {
      await roleRepository.remove(existingRoles);
      if(!useTest) {
        console.log(
          '✅ Cleared all existing roles and their permission relationships',
        );
      }
    }

    // Finally clear all permissions
    const existingPermissions = await permissionRepository.find();
    if (existingPermissions.length > 0) {
      await permissionRepository.remove(existingPermissions);
      if(!useTest) {
        console.log('✅ Cleared all existing permissions');
      }
    }

    // 2. Seed Permissions
    if(!useTest) {
      console.log('🔐 Creating permissions...');
    }
    const permissionMap = new Map<string, Permission>();

    for (const permData of seedPermissions) {
      const permission = permissionRepository.create(permData);
      await permissionRepository.save(permission);
      if(!useTest) {
        console.log(`✅ Created permission: ${permData.name}`);
      }
      permissionMap.set(permission.name, permission);
    }

    // 3. Seed Roles with Permissions
    if(!useTest) {
      console.log('🎭 Creating roles with permissions...');
    }

    for (const roleData of seedRoles) {
      const { permissions: permissionNames, ...roleInfo } = roleData;

      // Get the permissions for this role
      const rolePermissions = permissionNames
        .map((permName) => permissionMap.get(permName))
        .filter(Boolean);

      const role = roleRepository.create(roleInfo);
      role.permissions = rolePermissions;
      await roleRepository.save(role);
      if(!useTest) {
        console.log(
          `✅ Created role: ${roleData.name} with ${rolePermissions.length} permissions`,
        );
      }
    }

    if(!useTest) {
      console.log('🎉 Permissions and roles reset completed successfully!');
    }

    // Display summary
    const totalPermissions = await permissionRepository.count();
    const totalRoles = await roleRepository.count();

    if(!useTest) {
      console.log('\n📊 Reset Summary:');
      console.log(`   • ${totalPermissions} permissions created`);
      console.log(`   • ${totalRoles} roles created`);
    }

    if(!useTest) {
      console.log('\n🎭 Created roles:');
    }
    const allRoles = await roleRepository.find({ relations: ['permissions'] });
    allRoles.forEach((role) => {
      if(!useTest) {
        console.log(
          `   • ${role.displayName} (${role.name}) - ${role.permissions.length} permissions`,
        );
      }
    });

    if(!useTest) {
      console.log('\n🔐 Created permissions:');
    }
    const allPermissions = await permissionRepository.find();
    allPermissions.forEach((permission) => {
      if(!useTest) {
        console.log(`   • ${permission.name} - ${permission.displayName}`);
      }
    });

    return { totalPermissions, totalRoles };
  } catch (error) {
    console.error('❌ Error during permissions and roles seeding:', error);
    if (!shouldCloseDb) {
      throw error; // Re-throw for parent function to handle
    }
    process.exit(1);
  } finally {
    // Close the database connection only if requested
    if (shouldCloseDb && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      if(!useTest) {
        console.log('\n🔌 Database connection closed');
      }
    }
    if (shouldCloseDb) {
      process.exit(0);
    }
  }
}

// Export the function for reuse
export { seedPermissionsAndRoles };

// Run the permissions and roles seeding only if this file is executed directly
if (require.main === module) {
  void seedPermissionsAndRoles();
}
