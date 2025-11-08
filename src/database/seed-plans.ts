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

    const plansToSeed = [
      {
        uuid: '3fe8e4b1-d58d-4349-8c95-51697526466a',
        name: 'Pro',
        description: 'Professional salon management - Monthly',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 1500, // $15.00
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        stripePlanId: 'prod_TKtbt0Yo9JDBdf',
        stripePriceId: 'price_1SODobBb3cmGDEYZ2rPRORZU',
        trialPeriodDays: 0,
        displayOrder: 1,
        createdByUuid: adminUser?.uuid,
      },
      {
        uuid: 'f533c65b-b282-4b97-8b15-a0eaa5ec698d',
        name: 'Enterprise',
        description: 'Enterprise salon management - Monthly',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 3000, // $30.00
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        stripePlanId: 'prod_TKtcqXXJfnYskg',
        stripePriceId: 'price_1SODpZBb3cmGDEYZemAciUG7',
        trialPeriodDays: 0,
        displayOrder: 2,
        createdByUuid: adminUser?.uuid,
      },
      {
        uuid: '9fd09929-24c8-4711-96fe-f188831861e9',
        name: 'Pro',
        description: 'Professional salon management - Yearly',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 17500, // $175.00
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.YEAR,
        billingIntervalCount: 1,
        stripePlanId: 'prod_TKtbt0Yo9JDBdf',
        stripePriceId: 'price_1SODp9Bb3cmGDEYZAYiPcGVN',
        trialPeriodDays: 7,
        displayOrder: 3,
        createdByUuid: adminUser?.uuid,
      },
      {
        uuid: 'cc7b7c08-3c75-43c8-9ba6-772eff1a2cf5',
        name: 'Enterprise',
        description: 'Enterprise salon management - Yearly',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 34000, // $340.00
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.YEAR,
        billingIntervalCount: 1,
        stripePlanId: 'prod_TKtcqXXJfnYskg',
        stripePriceId: 'price_1SODq9Bb3cmGDEYZiZmS0iDr',
        trialPeriodDays: 7,
        displayOrder: 4,
        createdByUuid: adminUser?.uuid,
      },
    ];

    console.log('📦 Creating plans...');
    const createdPlans: Plan[] = [];

    for (const planData of plansToSeed) {
      // Check if plan with this stripePlanId and stripePriceId already exists
      const existingPlan = await planRepository.findOne({
        where: {
          stripePlanId: planData.stripePlanId,
          stripePriceId: planData.stripePriceId,
        },
      });

      if (existingPlan) {
        console.log(`   ⏭️  Skipped: ${planData.name} - Plan already exists (${planData.stripePlanId}/${planData.stripePriceId})`);
      } else {
        const plan = planRepository.create(planData);
        const savedPlan = await planRepository.save(plan);
        createdPlans.push(savedPlan);
        console.log(`   ✅ Created: ${savedPlan.name} - $${(savedPlan.priceCents / 100).toFixed(2)}/${savedPlan.billingInterval}`);
      }
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