import * as bcrypt from 'bcryptjs';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AppDataSource } from './data-source';

export const seedUsers = [
  {
    email: 'admin@ezsalon.com',
    name: 'System Administrator',
    password: 'admin123',
    roleName: 'admin',
    phone: '+1234567890',
    status: 'ACTIVED',
  },
  {
    email: 'moderator@ezsalon.com',
    name: 'Moderator',
    password: 'moderator123',
    roleName: 'moderator',
    phone: '+1234567891',
    status: 'ACTIVED',
  },
];

async function seedUsersOnly(shouldInitializeDb = true, shouldCloseDb = true) {
  try {
    console.log('🌱 Starting users-only seeding/updating...');

    // Initialize the data source only if requested
    if (shouldInitializeDb) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    // Check if roles exist (required for user creation)
    const roleCount = await roleRepository.count();
    if (roleCount === 0) {
      console.log(
        '❌ No roles found! Please run "npm run seed:all" first to create roles and permissions.',
      );
      if (shouldCloseDb) {
        process.exit(1);
      } else {
        throw new Error('No roles found - cannot create users without roles');
      }
    }

    console.log('👥 Creating/updating users...');
    const roleMap = new Map<string, Role>();

    // Load existing roles
    const existingRoles = await roleRepository.find();
    for (const role of existingRoles) {
      roleMap.set(role.name, role);
    }

    for (const userData of seedUsers) {
      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
        relations: ['role'],
      });

      // Get the role for this user
      const userRole = roleMap.get(userData.roleName);
      if (!userRole) {
        console.log(
          `❌ Role ${userData.roleName} not found for user ${userData.email}, skipping...`,
        );
        continue;
      }

      if (existingUser) {
        // Update existing user (but keep the same password unless explicitly changed)
        const { roleName, password, ...userInfo } = userData;

        // Only hash and update password if it's different from a default value
        // In production, you might want to skip password updates entirely
        let updatedPassword = existingUser.password;
        if (password && password !== 'unchanged') {
          updatedPassword = await bcrypt.hash(password, 10);
        }

        Object.assign(existingUser, {
          ...userInfo,
          password: updatedPassword,
          role: userRole,
        });

        await userRepository.save(existingUser);
        console.log(
          `🔄 Updated user: ${userData.name} (${userData.email}) - ${userRole.displayName}`,
        );
      } else {
        // Hash the password for new user
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create and save the user
        const { roleName, ...userInfo } = userData;
        const user = userRepository.create({
          ...userInfo,
          password: hashedPassword,
          role: userRole,
        });

        await userRepository.save(user);
        console.log(
          `✅ Created user: ${userData.name} (${userData.email}) - ${userRole.displayName}`,
        );
      }
    }

    console.log('🎉 Users seeding/updating completed successfully!');

    // Display summary
    const totalUsers = await userRepository.count();
    console.log(`📊 Total users in database: ${totalUsers}`);

    return { totalUsers };
  } catch (error) {
    console.error('❌ Error during users seeding:', error);
    if (!shouldCloseDb) {
      throw error; // Re-throw for parent function to handle
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  } finally {
    // Close the database connection only if requested
    if (shouldCloseDb && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Export the function for reuse
export { seedUsersOnly };

// Run the seeding function only if this file is executed directly
if (require.main === module) {
  void seedUsersOnly();
}
