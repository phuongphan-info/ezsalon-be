import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';
import { PlansService } from '../src/plans/plans.service';
import { PLAN_STATUS, PLAN_TYPE, BILLING_INTERVAL } from '../src/plans/entities/plan.entity';

describe('Plans E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let plansService: PlansService;
  let dataSource: DataSource;
  
  // Tokens for different users
  let adminAccessToken: string;
  let moderatorAccessToken: string;
  
  // User data
  let adminUser: any;
  let moderatorUser: any;
  
  // Plan data
  let adminPlan: any;
  let moderatorPlan: any;
  
  // Arrays to collect created data for cleanup
  const createdUserUuids: string[] = [];
  const createdPlanUuids: string[] = [];
  
  const generateUniqueEmail = () => `test-e2e-${Date.now()}-${uuid()}@ezsalon.io`;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheService = moduleFixture.get<CacheService>(CacheService);
    plansService = moduleFixture.get<PlansService>(PlansService);
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
      // Plans will be automatically deleted due to CASCADE delete constraint
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

  describe('Plans Permission Testing Flow', () => {
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

    it('3. Admin creates plan test-e2e-plan-a-of-admin', async () => {
      const planData = {
        name: 'test-e2e-plan-a-of-admin',
        description: 'Test plan created by admin',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 2999,
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        displayOrder: 1
      };

      const response = await request(app.getHttpServer())
        .post('/plans')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(planData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe(planData.name);
      expect(response.body.status).toBe(planData.status);
      
      adminPlan = response.body;
      createdPlanUuids.push(adminPlan.uuid);
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

    it('6. Moderator checks if admin plan exists in GET plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Moderator should NOT see admin's plan (only their own plans)
      const adminPlanExists = response.body.data.some(
        (plan: any) => plan.name === 'test-e2e-plan-a-of-admin'
      );
      expect(adminPlanExists).toBe(false);
    });

    it('7. Moderator checks if admin plan exists in GET plans/[uuid]', async () => {
      // Moderator should get 403 Forbidden when trying to access admin's plan
      await request(app.getHttpServer())
        .get(`/plans/${adminPlan.uuid}`)
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(403);
    });

    it('8. Admin checks if admin plan exists in GET plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Admin should see all plans including their own
      const adminPlanExists = response.body.data.some(
        (plan: any) => plan.name === 'test-e2e-plan-a-of-admin'
      );
      expect(adminPlanExists).toBe(true);
    });

    it('9. Admin checks if admin plan exists in GET plans/[uuid]', async () => {
      const response = await request(app.getHttpServer())
        .get(`/plans/${adminPlan.uuid}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(adminPlan.uuid);
      expect(response.body.name).toBe('test-e2e-plan-a-of-admin');
    });

    it('10. Moderator creates plan test-e2e-plan-a-of-moderator', async () => {
      const planData = {
        name: 'test-e2e-plan-a-of-moderator',
        description: 'Test plan created by moderator',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 1999,
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        displayOrder: 2
      };

      const response = await request(app.getHttpServer())
        .post('/plans')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .send(planData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe(planData.name);
      expect(response.body.status).toBe(planData.status);
      
      moderatorPlan = response.body;
      createdPlanUuids.push(moderatorPlan.uuid);
    });

    it('11. Moderator checks if moderator plan exists in GET plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Moderator should see their own plan
      const moderatorPlanExists = response.body.data.some(
        (plan: any) => plan.name === 'test-e2e-plan-a-of-moderator'
      );
      expect(moderatorPlanExists).toBe(true);
    });

    it('12. Moderator checks if moderator plan exists in GET plans/[uuid]', async () => {
      const response = await request(app.getHttpServer())
        .get(`/plans/${moderatorPlan.uuid}`)
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(moderatorPlan.uuid);
      expect(response.body.name).toBe('test-e2e-plan-a-of-moderator');
    });

    it('13. Admin checks if moderator plan exists in GET plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Admin should see all plans including moderator's plan
      const moderatorPlanExists = response.body.data.some(
        (plan: any) => plan.name === 'test-e2e-plan-a-of-moderator'
      );
      expect(moderatorPlanExists).toBe(true);
    });

    it('14. Admin checks if moderator plan exists in GET plans/[uuid]', async () => {
      const response = await request(app.getHttpServer())
        .get(`/plans/${moderatorPlan.uuid}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(moderatorPlan.uuid);
      expect(response.body.name).toBe('test-e2e-plan-a-of-moderator');
    });

    it('15. Create second moderator user and test plan isolation', async () => {
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

      // Create plan for second moderator
      const planData = {
        name: 'test-e2e-plan-b-of-moderator-2',
        description: 'Test plan created by second moderator',
        status: PLAN_STATUS.ACTIVE,
        type: PLAN_TYPE.SUBSCRIPTION,
        priceCents: 3999,
        currency: 'USD',
        billingInterval: BILLING_INTERVAL.MONTH,
        billingIntervalCount: 1,
        displayOrder: 3
      };

      const createPlanResponse = await request(app.getHttpServer())
        .post('/plans')
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .send(planData)
        .expect(201);

      expect(createPlanResponse.body).toHaveProperty('uuid');
      const moderator2Plan = createPlanResponse.body;
      createdPlanUuids.push(moderator2Plan.uuid);

      // Second moderator should only see their own plan in GET /plans
      const getPlansResponse = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .expect(200);

      expect(getPlansResponse.body).toHaveProperty('data');
      expect(Array.isArray(getPlansResponse.body.data)).toBe(true);
      expect(getPlansResponse.body.data).toHaveLength(1);
      expect(getPlansResponse.body.data[0].name).toBe('test-e2e-plan-b-of-moderator-2');

      // Second moderator should be able to access their own plan via GET /plans/{uuid}
      const getPlanResponse = await request(app.getHttpServer())
        .get(`/plans/${moderator2Plan.uuid}`)
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .expect(200);

      expect(getPlanResponse.body.uuid).toBe(moderator2Plan.uuid);
      expect(getPlanResponse.body.name).toBe('test-e2e-plan-b-of-moderator-2');

      // Second moderator should NOT be able to access first moderator's plan
      await request(app.getHttpServer())
        .get(`/plans/${moderatorPlan.uuid}`)
        .set('Authorization', `Bearer ${moderator2AccessToken}`)
        .expect(403);

      // First moderator should NOT be able to access second moderator's plan
      await request(app.getHttpServer())
        .get(`/plans/${moderator2Plan.uuid}`)
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(403);

      // Admin should be able to see all plans (including the new one)
      const adminPlansResponse = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminPlansResponse.body.data.length).toBeGreaterThanOrEqual(3);
      const planNames = adminPlansResponse.body.data.map((p: any) => p.name);
      expect(planNames).toContain('test-e2e-plan-a-of-admin');
      expect(planNames).toContain('test-e2e-plan-a-of-moderator');
      expect(planNames).toContain('test-e2e-plan-b-of-moderator-2');

      // Admin should be able to access second moderator's plan
      const adminGetPlanResponse = await request(app.getHttpServer())
        .get(`/plans/${moderator2Plan.uuid}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminGetPlanResponse.body.uuid).toBe(moderator2Plan.uuid);
      expect(adminGetPlanResponse.body.name).toBe('test-e2e-plan-b-of-moderator-2');
    });

    it('16. Cleanup - Delete test users and plans', async () => {
      // This test ensures cleanup happens
      // The actual cleanup is handled in afterAll hook
      expect(createdUserUuids.length).toBe(3);
      expect(createdPlanUuids.length).toBe(3);
      
      // Verify plans exist before cleanup (skip if plans weren't created due to earlier failures)
      if (adminPlan && adminPlan.uuid) {
        const adminPlanResponse = await request(app.getHttpServer())
          .get(`/plans/${adminPlan.uuid}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);
        
        expect(adminPlanResponse.body.uuid).toBe(adminPlan.uuid);
      }
      
      if (moderatorPlan && moderatorPlan.uuid) {
        const moderatorPlanResponse = await request(app.getHttpServer())
          .get(`/plans/${moderatorPlan.uuid}`)
          .set('Authorization', `Bearer ${moderatorAccessToken}`)
          .expect(200);
        
        expect(moderatorPlanResponse.body.uuid).toBe(moderatorPlan.uuid);
      }
    });
  });
});