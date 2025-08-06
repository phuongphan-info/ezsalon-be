import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';
import { ProductsService } from '../src/products/products.service';
import { PRODUCT_STATUS, PRODUCT_TYPE, BILLING_INTERVAL } from '../src/products/entities/product.entity';

describe('Products E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let productsService: ProductsService;
  let dataSource: DataSource;
  
  // Tokens for different users
  let adminAccessToken: string;
  let moderatorAccessToken: string;
  
  // User data
  let adminUser: any;
  let moderatorUser: any;
  
  // Product data
  let adminProduct: any;
  let moderatorProduct: any;
  
  // Arrays to collect created data for cleanup
  const createdUserUuids: string[] = [];
  const createdProductUuids: string[] = [];
  
  const generateUniqueEmail = () => `test-e2e-${Date.now()}-${uuid()}@ezsalon.io`;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheService = moduleFixture.get<CacheService>(CacheService);
    productsService = moduleFixture.get<ProductsService>(ProductsService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    await app.init();

    // Clear cache before tests
    await cacheService.reset();
  });

  /**
   * Clean up all test data
   */
  const cleanupAllTestData = async () => {
    try {
      // Delete users in reverse order to handle foreign key constraints
      // Products will be automatically deleted due to CASCADE delete constraint
      // Delete moderator first (created by admin), then admin
      const usersToDelete = [...createdUserUuids].reverse();
      
      for (const userUuid of usersToDelete) {
        try {
          await dataSource.query('DELETE FROM users WHERE uuid = ?', [userUuid]);
        } catch (error) {
          // Ignore errors, user might already be deleted or have dependencies
          console.log(`Could not delete user ${userUuid}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  afterAll(async () => {
    // Clean up all test data
    await cleanupAllTestData();
    
    // Clear cache and close app
    await cacheService.reset();
    await app.close();
  });

  describe('Products Permission Testing Flow', () => {
    it('0. Login with existing admin to create test users', async () => {
      // First login with existing admin to create test users
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@ezsalon.com',
          password: 'admin123'
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      adminAccessToken = response.body.accessToken;
    });

    it('1. Create admin user test-e2e-user-admin', async () => {
      const adminUserData = {
        email: generateUniqueEmail(),
        password: 'TestPassword123!',
        name: 'test-e2e-user-admin',
        phone: '+1234567890',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(adminUserData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(adminUserData.email);
      expect(response.body.name).toBe(adminUserData.name);
      
      adminUser = response.body;
      createdUserUuids.push(adminUser.uuid);
    });

    it('2. Login with user test-e2e-user-admin', async () => {
      const loginData = {
        email: adminUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      adminAccessToken = response.body.accessToken;
    });

    it('3. Admin creates product test-e2e-product-a-of-admin', async () => {
      const productData = {
        name: 'test-e2e-product-a-of-admin',
        description: 'Test product created by admin',
        status: PRODUCT_STATUS.ACTIVE,
        type: PRODUCT_TYPE.SUBSCRIPTION,
        priceCents: 2999,
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        maxSalons: 5,
        maxStaffPerSalon: 10,
        displayOrder: 1
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe(productData.name);
      expect(response.body.status).toBe(productData.status);
      
      adminProduct = response.body;
      createdProductUuids.push(adminProduct.uuid);
    });

    it('4. Create moderator user test-e2e-user-moderator', async () => {
      const moderatorUserData = {
        email: generateUniqueEmail(),
        password: 'TestPassword123!',
        name: 'test-e2e-user-moderator',
        phone: '+1234567891',
        role: 'moderator'
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(moderatorUserData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(moderatorUserData.email);
      expect(response.body.name).toBe(moderatorUserData.name);
      
      moderatorUser = response.body;
      createdUserUuids.push(moderatorUser.uuid);
    });

    it('5. Login with user test-e2e-user-moderator', async () => {
      const loginData = {
        email: moderatorUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      moderatorAccessToken = response.body.accessToken;
    });

    it('6. Moderator checks if admin product exists in GET products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Moderator should NOT see admin's product (only their own products)
      const adminProductExists = response.body.data.some(
        (product: any) => product.name === 'test-e2e-product-a-of-admin'
      );
      expect(adminProductExists).toBe(false);
    });

    it('7. Moderator checks if admin product exists in GET products/[uuid]', async () => {
      // Moderator should get 403 Forbidden when trying to access admin's product
      await request(app.getHttpServer())
        .get(`/products/${adminProduct.uuid}`)
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(403);
    });

    it('8. Admin checks if admin product exists in GET products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Admin should see all products including their own
      const adminProductExists = response.body.data.some(
        (product: any) => product.name === 'test-e2e-product-a-of-admin'
      );
      expect(adminProductExists).toBe(true);
    });

    it('9. Admin checks if admin product exists in GET products/[uuid]', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${adminProduct.uuid}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(adminProduct.uuid);
      expect(response.body.name).toBe('test-e2e-product-a-of-admin');
    });

    it('10. Moderator creates product test-e2e-product-a-of-moderator', async () => {
      const productData = {
        name: 'test-e2e-product-a-of-moderator',
        description: 'Test product created by moderator',
        status: PRODUCT_STATUS.ACTIVE,
        type: PRODUCT_TYPE.SUBSCRIPTION,
        priceCents: 1999,
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        maxSalons: 3,
        maxStaffPerSalon: 5,
        displayOrder: 2
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe(productData.name);
      expect(response.body.status).toBe(productData.status);
      
      moderatorProduct = response.body;
      createdProductUuids.push(moderatorProduct.uuid);
    });

    it('11. Moderator checks if moderator product exists in GET products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Moderator should see their own product
      const moderatorProductExists = response.body.data.some(
        (product: any) => product.name === 'test-e2e-product-a-of-moderator'
      );
      expect(moderatorProductExists).toBe(true);
    });

    it('12. Moderator checks if moderator product exists in GET products/[uuid]', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${moderatorProduct.uuid}`)
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(moderatorProduct.uuid);
      expect(response.body.name).toBe('test-e2e-product-a-of-moderator');
    });

    it('13. Admin checks if moderator product exists in GET products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Admin should see all products including moderator's product
      const moderatorProductExists = response.body.data.some(
        (product: any) => product.name === 'test-e2e-product-a-of-moderator'
      );
      expect(moderatorProductExists).toBe(true);
    });

    it('14. Admin checks if moderator product exists in GET products/[uuid]', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${moderatorProduct.uuid}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(moderatorProduct.uuid);
      expect(response.body.name).toBe('test-e2e-product-a-of-moderator');
    });

    it('15. Create second moderator user and test product isolation', async () => {
      // Create second moderator user
      const moderator2UserData = {
        email: generateUniqueEmail(),
        password: 'TestPassword123!',
        name: 'test-e2e-user-moderator-2',
        phone: '+1234567892',
        role: 'moderator'
      };

      const createUserResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(moderator2UserData)
        .expect(201);

      expect(createUserResponse.body).toHaveProperty('uuid');
      const moderator2User = createUserResponse.body;
      createdUserUuids.push(moderator2User.uuid);

      // Login with second moderator
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: moderator2User.email,
          password: 'TestPassword123!'
        })
        .expect(201);

      const moderator2AccessToken = loginResponse.body.accessToken;

      // Create product for second moderator
      const productData = {
        name: 'test-e2e-product-b-of-moderator-2',
        description: 'Test product created by second moderator',
        status: PRODUCT_STATUS.ACTIVE,
        type: PRODUCT_TYPE.SUBSCRIPTION,
        priceCents: 3999,
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        maxSalons: 2,
        maxStaffPerSalon: 8,
        displayOrder: 3
      };

      const createProductResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .send(productData)
        .expect(201);

      expect(createProductResponse.body).toHaveProperty('uuid');
      const moderator2Product = createProductResponse.body;
      createdProductUuids.push(moderator2Product.uuid);

      // Second moderator should only see their own product in GET /products
      const getProductsResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .expect(200);

      expect(getProductsResponse.body).toHaveProperty('data');
      expect(Array.isArray(getProductsResponse.body.data)).toBe(true);
      expect(getProductsResponse.body.data).toHaveLength(1);
      expect(getProductsResponse.body.data[0].name).toBe('test-e2e-product-b-of-moderator-2');

      // Second moderator should be able to access their own product via GET /products/{uuid}
      const getProductResponse = await request(app.getHttpServer())
        .get(`/products/${moderator2Product.uuid}`)
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .expect(200);

      expect(getProductResponse.body.uuid).toBe(moderator2Product.uuid);
      expect(getProductResponse.body.name).toBe('test-e2e-product-b-of-moderator-2');

      // Second moderator should NOT be able to access first moderator's product
      await request(app.getHttpServer())
        .get(`/products/${moderatorProduct.uuid}`)
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .expect(403);

      // First moderator should NOT be able to access second moderator's product
      await request(app.getHttpServer())
        .get(`/products/${moderator2Product.uuid}`)
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(403);

      // Admin should be able to see all products (including the new one)
      const adminProductsResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminProductsResponse.body.data.length).toBeGreaterThanOrEqual(3);
      const productNames = adminProductsResponse.body.data.map((p: any) => p.name);
      expect(productNames).toContain('test-e2e-product-a-of-admin');
      expect(productNames).toContain('test-e2e-product-a-of-moderator');
      expect(productNames).toContain('test-e2e-product-b-of-moderator-2');

      // Admin should be able to access second moderator's product
      const adminGetProductResponse = await request(app.getHttpServer())
        .get(`/products/${moderator2Product.uuid}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminGetProductResponse.body.uuid).toBe(moderator2Product.uuid);
      expect(adminGetProductResponse.body.name).toBe('test-e2e-product-b-of-moderator-2');
    });

    it('16. Cleanup - Delete test users and products', async () => {
      // This test ensures cleanup happens
      // The actual cleanup is handled in afterAll hook
      expect(createdUserUuids.length).toBe(3);
      expect(createdProductUuids.length).toBe(3);
      
      // Verify products exist before cleanup (skip if products weren't created due to earlier failures)
      if (adminProduct && adminProduct.uuid) {
        const adminProductResponse = await request(app.getHttpServer())
          .get(`/products/${adminProduct.uuid}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);
        
        expect(adminProductResponse.body.uuid).toBe(adminProduct.uuid);
      }
      
      if (moderatorProduct && moderatorProduct.uuid) {
        const moderatorProductResponse = await request(app.getHttpServer())
          .get(`/products/${moderatorProduct.uuid}`)
          .set('Authorization', `Bearer ${moderatorAccessToken}`)
          .expect(200);
        
        expect(moderatorProductResponse.body.uuid).toBe(moderatorProduct.uuid);
      }
    });
  });
});