import { Plan, PLAN_STATUS, PLAN_TYPE, BILLING_INTERVAL } from '../plans/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { AppDataSource } from './data-source';
import { resolveDatabaseConfig } from './database-env.util';

const { useTest } = resolveDatabaseConfig();

export async function seedPlansOnly(
  shouldInitializeDb = true,
  shouldCloseDb = true,
) {
  const dataSource = shouldInitializeDb ? await AppDataSource.initialize() : AppDataSource;
  const planRepository = dataSource.getRepository(Plan);
  const userRepository = dataSource.getRepository(User);

  try {
    console.log('🌱 Starting plans seeding...');

    // Find admin user to assign as plan creator
    const adminUser = await userRepository.findOne({
      where: { email: 'admin@ezsalon.com' },
    });

    if (!adminUser) {
      console.log('⚠️  Admin user not found. Plans will be created without a creator.');
    }

    // Clear existing plans (handle foreign key constraints)
    console.log('🗑️  Clearing existing plans...');
    
    // First, check if there are any existing plans
    const existingPlans = await planRepository.find();
    
    if (existingPlans.length > 0) {
      console.log(`   Found ${existingPlans.length} existing plans to remove...`);
      
      // Check if there are any subscriptions referencing these plans
      const subscriptionRepository = dataSource.getRepository('Subscription');
      const subscriptionsCount = await subscriptionRepository.count();
      
      if (subscriptionsCount > 0) {
        console.log('⚠️  Found existing subscriptions. Clearing subscriptions first...');
        await subscriptionRepository.clear();
      }
      
      // Now we can safely clear plans
      await planRepository.clear();
      console.log('   ✅ Plans cleared successfully');
    } else {
      console.log('   ℹ️  No existing plans found');
    }

    const plansToSeed = [
      {
        name: 'EzSalon Pro Monthly',
        description: 'Professional salon management with all features included. Perfect for growing salons.',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 2999, // $29.99
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        trialPeriodDays: 7,
        displayOrder: 1,
        createdByUuid: adminUser?.uuid,
      },
      {
        name: 'EzSalon Pro Yearly',
        description: 'Professional salon management with all features included. Save 2 months with yearly billing!',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 29990, // $299.90 (save ~$60 per year)
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.YEAR,
        billingIntervalCount: 1,
        trialPeriodDays: 7,
        displayOrder: 2,
        createdByUuid: adminUser?.uuid,
      },
    ];

    console.log('📦 Creating plans...');
    const createdPlans: Plan[] = [];

    for (const planData of plansToSeed) {
      const plan = planRepository.create(planData);
      const savedPlan = await planRepository.save(plan);
      createdPlans.push(savedPlan);
      console.log(`   ✅ Created: ${savedPlan.name} - $${(savedPlan.priceCents / 100).toFixed(2)}/${savedPlan.billingInterval}`);
    }

    console.log(`\n🎉 Successfully created ${createdPlans.length} plans!`);

    // Display summary
    console.log('\n📊 Plans Summary:');
    for (const plan of createdPlans) {
      const price = (plan.priceCents / 100).toFixed(2);
      const billingText = plan.billingInterval === BILLING_INTERVAL.YEAR ? 'year' : 'month';
      console.log(`   • ${plan.name}`);
      console.log(`     - Price: $${price}/${billingText}`);
      console.log(`     - Trial: ${plan.trialPeriodDays} days`);
      console.log(`     - Status: ${plan.status}`);
      console.log('');
    }

    return createdPlans;
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  } finally {
    if (shouldCloseDb && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Allow running this script directly
if (require.main === module) {
  seedPlansOnly()
    .then(() => {
      if(!useTest) {
        console.log('✅ Plans seeding completed successfully!');
      }
      process.exit(0);
    })
    .catch((error) => {
      if(!useTest) {
        console.error('❌ Plans seeding failed:', error);
      }
      process.exit(1);
    });
}