import { Permission } from '../roles/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AppDataSource } from './data-source';

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
    description: 'View user information',
    resource: 'users',
    action: 'read',
  },
  {
    name: 'users:update',
    displayName: 'Update Users',
    description: 'Update user information',
    resource: 'users',
    action: 'update',
  },
  {
    name: 'users:delete',
    displayName: 'Delete Users',
    description: 'Delete users',
    resource: 'users',
    action: 'delete',
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

  // permissions
  {
    name: 'permissions:create',
    displayName: 'Create Permissions',
    description: 'Create new permissions',
    resource: 'permissions',
    action: 'create',
  },
  {
    name: 'permissions:read',
    displayName: 'Read Permissions',
    description: 'View permission information',
    resource: 'permissions',
    action: 'read',
  },
  {
    name: 'permissions:update',
    displayName: 'Update Permissions',
    description: 'Update permission information',
    resource: 'permissions',
    action: 'update',
  },
  {
    name: 'permissions:delete',
    displayName: 'Delete Permissions',
    description: 'Delete permissions',
    resource: 'permissions',
    action: 'delete',
  },

  // Salon permissions (for future use)
  {
    name: 'salons:create',
    displayName: 'Create Salons',
    description: 'Create new salons',
    resource: 'salons',
    action: 'create',
  },
  {
    name: 'salons:read',
    displayName: 'Read Salons',
    description: 'View salon information',
    resource: 'salons',
    action: 'read',
  },
  {
    name: 'salons:update',
    displayName: 'Update Salons',
    description: 'Update salon information',
    resource: 'salons',
    action: 'update',
  },
  {
    name: 'salons:delete',
    displayName: 'Delete Salons',
    description: 'Delete salons',
    resource: 'salons',
    action: 'delete',
  },

  // Service permissions (for future use)
  {
    name: 'services:create',
    displayName: 'Create Services',
    description: 'Create new services',
    resource: 'services',
    action: 'create',
  },
  {
    name: 'services:read',
    displayName: 'Read Services',
    description: 'View service information',
    resource: 'services',
    action: 'read',
  },
  {
    name: 'services:update',
    displayName: 'Update Services',
    description: 'Update service information',
    resource: 'services',
    action: 'update',
  },
  {
    name: 'services:delete',
    displayName: 'Delete Services',
    description: 'Delete services',
    resource: 'services',
    action: 'delete',
  },

  // Report permissions (for future use)
  {
    name: 'reports:read',
    displayName: 'Read Reports',
    description: 'View reports',
    resource: 'reports',
    action: 'read',
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
      'users:update',
      'users:delete',
      'roles:create',
      'roles:read',
      'roles:update',
      'roles:delete',
      'permissions:create',
      'permissions:read',
      'permissions:update',
      'permissions:delete',
      'salons:create',
      'salons:read',
      'salons:update',
      'salons:delete',
      'services:create',
      'services:read',
      'services:update',
      'services:delete',
      'reports:read',
    ],
  },
  {
    name: 'owner',
    displayName: 'Salon Owner',
    description: 'Business owner with full operational control',
    color: '#7c2d12',
    permissions: [
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'roles:read',
      'roles:update',
      'salons:create',
      'salons:read',
      'salons:update',
      'salons:delete',
      'services:create',
      'services:read',
      'services:update',
      'services:delete',
      'reports:read',
    ],
  },
  {
    name: 'manager',
    displayName: 'Salon Manager',
    description: 'Day-to-day salon operations management',
    color: '#059669',
    permissions: [
      'users:read',
      'users:update',
      'roles:read',
      'salons:create',
      'salons:read',
      'salons:update',
      'salons:delete',
      'services:create',
      'services:read',
      'services:update',
      'services:delete',
      'reports:read',
    ],
  },
  {
    name: 'staff',
    displayName: 'Salon Staff',
    description: 'Staff members (stylists, technicians, etc.)',
    color: '#7c3aed',
    permissions: ['users:read', 'salons:read', 'salons:update', 'services:read'],
  },
];

async function seedPermissionsAndRoles(shouldInitializeDb = true, shouldCloseDb = true) {
  try {
    console.log('🌱 Starting permissions and roles seeding (reset mode)...');

    // Initialize the data source only if requested
    if (shouldInitializeDb) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const userRepository = AppDataSource.getRepository(User);

    // 1. Clear existing permissions and roles (reset mode)
    console.log('🗑️  Clearing existing roles and permissions...');

    // We need to handle foreign key constraints properly
    // First, find and remove all users that reference roles
    const existingUsers = await userRepository.find();
    if (existingUsers.length > 0) {
      await userRepository.remove(existingUsers);
      console.log('✅ Cleared all existing users (to remove role references)');
    }

    // Then clear role-permission relationships by finding and removing roles with relations
    const existingRoles = await roleRepository.find({ relations: ['permissions'] });
    if (existingRoles.length > 0) {
      await roleRepository.remove(existingRoles);
      console.log('✅ Cleared all existing roles and their permission relationships');
    }

    // Finally clear all permissions
    const existingPermissions = await permissionRepository.find();
    if (existingPermissions.length > 0) {
      await permissionRepository.remove(existingPermissions);
      console.log('✅ Cleared all existing permissions');
    }

    // 2. Seed Permissions
    console.log('🔐 Creating permissions...');
    const permissionMap = new Map<string, Permission>();

    for (const permData of seedPermissions) {
      const permission = permissionRepository.create(permData);
      await permissionRepository.save(permission);
      console.log(`✅ Created permission: ${permData.name}`);
      permissionMap.set(permission.name, permission);
    }

    // 3. Seed Roles with Permissions
    console.log('🎭 Creating roles with permissions...');

    for (const roleData of seedRoles) {
      const { permissions: permissionNames, ...roleInfo } = roleData;

      // Get the permissions for this role
      const rolePermissions = permissionNames
        .map(permName => permissionMap.get(permName))
        .filter(Boolean) as Permission[];

      const role = roleRepository.create(roleInfo);
      role.permissions = rolePermissions;
      await roleRepository.save(role);
      console.log(`✅ Created role: ${roleData.name} with ${rolePermissions.length} permissions`);
    }

    console.log('🎉 Permissions and roles reset completed successfully!');

    // Display summary
    const totalPermissions = await permissionRepository.count();
    const totalRoles = await roleRepository.count();

    console.log('\n📊 Reset Summary:');
    console.log(`   • ${totalPermissions} permissions created`);
    console.log(`   • ${totalRoles} roles created`);

    console.log('\n🎭 Created roles:');
    const allRoles = await roleRepository.find({ relations: ['permissions'] });
    allRoles.forEach(role => {
      console.log(
        `   • ${role.displayName} (${role.name}) - ${role.permissions.length} permissions`,
      );
    });

    console.log('\n🔐 Created permissions:');
    const allPermissions = await permissionRepository.find();
    allPermissions.forEach(permission => {
      console.log(`   • ${permission.name} - ${permission.displayName}`);
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
      console.log('\n🔌 Database connection closed');
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
