import { Permission } from '../roles/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Plan } from '../plans/entities/plan.entity';
import { AppDataSource } from './data-source';
import { seedPermissionsAndRoles } from './seed-permissions';
import { seedUsersOnly } from './seed-users';

async function seedAllData() {
  try {
    console.log('🌱 Starting comprehensive seeding (all data)...');

    // Initialize the data source once
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // 1. Seed permissions and roles first (with reset)
    console.log('\n' + '='.repeat(50));
    console.log('Step 1: Seeding Permissions and Roles');
    console.log('='.repeat(50));
    await seedPermissionsAndRoles(false, false); // Don't initialize/close DB

    // 2. Seed users (depends on roles)
    console.log('\n' + '='.repeat(50));
    console.log('Step 2: Seeding Users');
    console.log('='.repeat(50));
    await seedUsersOnly(false, false); // Don't initialize/close DB

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Comprehensive seeding completed successfully!');
    console.log('='.repeat(50));

    // Final summary
    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const planRepository = AppDataSource.getRepository(Plan);

    const totalUsers = await userRepository.count();
    const totalRoles = await roleRepository.count();
    const totalPermissions = await permissionRepository.count();
    const totalPlans = await planRepository.count();

    console.log('\n📊 Final Summary:');
    console.log(`   • ${totalPermissions} permissions created`);
    console.log(`   • ${totalRoles} roles created`);
    console.log(`   • ${totalUsers} users created`);
    console.log(`   • ${totalPlans} plans created`);

    console.log('\n📋 All users:');
    const allUsers = await userRepository.find({ relations: ['role'] });
    allUsers.forEach((user) => {
      console.log(
        `   • ${user.name} (${user.email}) - ${user.role.displayName}`,
      );
    });
  } catch (error) {
    console.error('❌ Error during comprehensive seeding:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the comprehensive seeding
void seedAllData();
