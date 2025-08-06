import { Product, PRODUCT_STATUS, PRODUCT_TYPE, BILLING_INTERVAL } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AppDataSource } from './data-source';

export async function seedProductsOnly(
  shouldInitializeDb = true,
  shouldCloseDb = true,
) {
  const dataSource = shouldInitializeDb ? await AppDataSource.initialize() : AppDataSource;
  const productRepository = dataSource.getRepository(Product);
  const userRepository = dataSource.getRepository(User);

  try {
    console.log('🌱 Starting products seeding...');

    // Find admin user to assign as product creator
    const adminUser = await userRepository.findOne({
      where: { email: 'admin@ezsalon.com' },
    });

    if (!adminUser) {
      console.log('⚠️  Admin user not found. Products will be created without a creator.');
    }

    // Clear existing products
    console.log('🗑️  Clearing existing products...');
    await productRepository.clear();

    const productsToSeed = [
      {
        name: 'EzSalon Pro Monthly',
        description: 'Professional salon management with all features included. Perfect for growing salons.',
        status: PRODUCT_STATUS.ACTIVE,
        type: PRODUCT_TYPE.SUBSCRIPTION,
        priceCents: 2999, // $29.99
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        trialPeriodDays: 7,
        maxSalons: 1,
        maxStaffPerSalon: 50,
        displayOrder: 1,
        createdByUuid: adminUser?.uuid,
      },
      {
        name: 'EzSalon Pro Yearly',
        description: 'Professional salon management with all features included. Save 2 months with yearly billing!',
        status: PRODUCT_STATUS.ACTIVE,
        type: PRODUCT_TYPE.SUBSCRIPTION,
        priceCents: 29990, // $299.90 (save ~$60 per year)
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.YEAR,
        billingIntervalCount: 1,
        trialPeriodDays: 7,
        maxSalons: 1,
        maxStaffPerSalon: 50,
        displayOrder: 2,
        createdByUuid: adminUser?.uuid,
      },
    ];

    console.log('📦 Creating products...');
    const createdProducts: Product[] = [];

    for (const productData of productsToSeed) {
      const product = productRepository.create(productData);
      const savedProduct = await productRepository.save(product);
      createdProducts.push(savedProduct);
      console.log(`   ✅ Created: ${savedProduct.name} - $${(savedProduct.priceCents / 100).toFixed(2)}/${savedProduct.billingInterval}`);
    }

    console.log(`\n🎉 Successfully created ${createdProducts.length} products!`);

    // Display summary
    console.log('\n📊 Products Summary:');
    for (const product of createdProducts) {
      const price = (product.priceCents / 100).toFixed(2);
      const billingText = product.billingInterval === BILLING_INTERVAL.YEAR ? 'year' : 'month';
      console.log(`   • ${product.name}`);
      console.log(`     - Price: $${price}/${billingText}`);
      console.log(`     - Trial: ${product.trialPeriodDays} days`);
      console.log(`     - Limits: ${product.maxSalons} salon(s), ${product.maxStaffPerSalon} staff per salon`);
      console.log(`     - Status: ${product.status}`);
      console.log('');
    }

    return createdProducts;
  } catch (error) {
    console.error('❌ Error seeding products:', error);
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
  seedProductsOnly()
    .then(() => {
      console.log('✅ Products seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Products seeding failed:', error);
      process.exit(1);
    });
}