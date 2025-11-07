/**
 * USER-CUSTOMERS E2E TESTS
 * 
 * Tests for /user/customers/:salonUuid endpoints
 * These endpoints use User JWT authentication (JwtAuthGuard) with permission-based access control
 * 
 * PERMISSIONS TESTED:
 * - customers:create - Create new customers in salons
 * - customers:read - Read customer data (limited to user's salons)
 * - customers:read-all - Read all customer data (across all salons)
 * - customers:update - Update customers (limited to user's salons)  
 * - customers:update-all - Update all customers (across all salons)
 * - customers:delete-all - Delete customers (across all salons)
 * 
 * ARCHITECTURE:
 * - Uses JwtAuthGuard (User authentication) NOT CustomerJwtAuthGuard
 * - Protected by PermissionsGuard with @RequireAnyPermission decorators
 * - Admin users with proper permissions can manage customers across salons
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';
import { CUSTOMER_STATUS } from '../src/customers/entities/customer.entity';
import { CUSTOMER_SALON_ROLE } from '../src/customers/entities/customer-salon.entity';

describe('Customer By User E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let dataSource: DataSource;

  // Track created resources for cleanup
  const createdCustomerUuids: string[] = [];
  const createdSalonUuids: string[] = [];
  const createdUserIds: string[] = [];

  // Helper functions
  const generateUniqueEmail = () => `test-${Date.now()}-${uuid()}@ezsalon.io`;
  const generateUniquePhone = () => `+84${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  const activateCustomer = async (customerUuid: string) => {
    await dataSource.query(
      'UPDATE customers SET status = ? WHERE uuid = ?',
      [CUSTOMER_STATUS.ACTIVED, customerUuid]
    );
  };

  // Test data
  let businessOwner: any;
  let businessOwnerToken: string;
  let salon1Uuid: string;
  let salon2Uuid: string;

  // Test customers
  let customer1: any; // Staff in Salon 1
  let customer2: any; // Manager in Salon 1
  let customer3: any; // Staff in Salon 2

  // Test users with different permissions
  let userReadToken: string; // User with customers:read permission
  let userReadAllToken: string; // User with customers:read-all permission
  let userCreateToken: string; // User with customers:create permission
  let userUpdateToken: string; // User with customers:update permission
  let userUpdateAllToken: string; // User with customers:update-all permission
  let userDeleteAllToken: string; // User with customers:delete-all permission
  let userNoPermissionToken: string; // User with no customer permissions

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    cacheService = moduleFixture.get<CacheService>(CacheService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    await app.init();
    await cacheService.reset();
  });

  afterAll(async () => {
    // Cleanup: Delete all created resources
    for (const uuid of createdCustomerUuids) {
      try {
        await dataSource.query('DELETE FROM customers WHERE uuid = ?', [uuid]);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    for (const id of createdUserIds) {
      try {
        await dataSource.query('DELETE FROM users WHERE uuid = ?', [id]);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    await cacheService.reset();
    await app.close();
  });

  describe('Setup: Create test data', () => {
    it('1. Create Business Owner and Salon 1', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers/register')
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Business Owner',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.BUSINESS_OWNER
        })
        .expect(201);

      businessOwner = response.body.customer;
      businessOwnerToken = response.body.accessToken;
      createdCustomerUuids.push(businessOwner.uuid);

      // Create Salon 1
      const salonResponse = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          name: 'Salon 1',
          address: '123 Test St',
          phone: '+84987654321',
          email: generateUniqueEmail()
        })
        .expect(201);

      salon1Uuid = salonResponse.body.uuid;
      createdSalonUuids.push(salon1Uuid);
    });

    it('2. Create Salon 2', async () => {
      const salonResponse = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          name: 'Salon 2',
          address: '456 Test Ave',
          phone: '+84987654322',
          email: generateUniqueEmail()
        })
        .expect(201);

      salon2Uuid = salonResponse.body.uuid;
      createdSalonUuids.push(salon2Uuid);
    });

    it('3. Create test customers in Salon 1', async () => {
      // Create Staff customer
      const staffResponse = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Staff Customer 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      customer1 = staffResponse.body;
      createdCustomerUuids.push(customer1.uuid);

      // Create Manager customer
      const managerResponse = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Manager Customer 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.MANAGER
        })
        .expect(201);

      customer2 = managerResponse.body;
      createdCustomerUuids.push(customer2.uuid);
    });

    it('4. Create test customer in Salon 2', async () => {
      const staffResponse = await request(app.getHttpServer())
        .post(`/customers/${salon2Uuid}`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Staff Customer 2',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      customer3 = staffResponse.body;
      createdCustomerUuids.push(customer3.uuid);
    });

    it('5. Create users with different permissions', async () => {
      // Login as admin to create users with permissions
      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@ezsalon.com',
          password: 'admin123'
        })
        .expect(201);
      
      const adminToken = adminLogin.body.accessToken;

      // Helper to create user via API (admin creates users)
      const createUser = async (name: string, email: string) => {
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email,
            password: 'password123',
            name,
            phone: `+84${Math.floor(1000000000 + Math.random() * 9000000000)}`
          })
          .expect(201);
        
        createdUserIds.push(response.body.uuid);
        return response.body.uuid;
      };

      // Helper to assign permission to user
      const assignPermission = async (userUuid: string, permissionName: string) => {
        // Get permission UUID
        const permResult = await dataSource.query(
          `SELECT uuid FROM permissions WHERE permission_name = ? LIMIT 1`,
          [permissionName]
        );
        
        if (permResult.length > 0) {
          const permUuid = permResult[0].uuid;
          
          // Get user's role or create one
          const userResult = await dataSource.query(
            `SELECT role_uuid FROM users WHERE uuid = ?`,
            [userUuid]
          );
          
          let roleUuid = userResult[0]?.role_uuid;
          
          if (!roleUuid) {
            // Create a custom role for this user
            roleUuid = uuid();
            await dataSource.query(
              `INSERT INTO roles (uuid, role_name, display_name) VALUES (?, ?, ?)`,
              [roleUuid, `role_${userUuid.slice(0, 8)}`, `Role for ${userUuid}`]
            );
            
            // Assign role to user
            await dataSource.query(
              `UPDATE users SET role_uuid = ? WHERE uuid = ?`,
              [roleUuid, userUuid]
            );
          }
          
          // Assign permission to role
          await dataSource.query(
            `INSERT IGNORE INTO role_permissions (role_uuid, permission_uuid) VALUES (?, ?)`,
            [roleUuid, permUuid]
          );
        }
      };

      // Create users
      const userReadUuid = await createUser('User Read', generateUniqueEmail());
      await assignPermission(userReadUuid, 'customers:read');
      
      const userReadAllUuid = await createUser('User Read All', generateUniqueEmail());
      await assignPermission(userReadAllUuid, 'customers:read');
      await assignPermission(userReadAllUuid, 'customers:read-all');
      
      const userCreateUuid = await createUser('User Create', generateUniqueEmail());
      await assignPermission(userCreateUuid, 'customers:create');
      await assignPermission(userCreateUuid, 'customers:read');
      await assignPermission(userCreateUuid, 'customers:update');
      
      const userUpdateUuid = await createUser('User Update', generateUniqueEmail());
      await assignPermission(userUpdateUuid, 'customers:update');
      await assignPermission(userUpdateUuid, 'customers:read');
      await assignPermission(userUpdateUuid, 'customers:create');
      
      const userUpdateAllUuid = await createUser('User Update All', generateUniqueEmail());
      await assignPermission(userUpdateAllUuid, 'customers:update-all');
      await assignPermission(userUpdateAllUuid, 'customers:read-all');
      
      const userDeleteAllUuid = await createUser('User Delete All', generateUniqueEmail());
      await assignPermission(userDeleteAllUuid, 'customers:delete-all');
      await assignPermission(userDeleteAllUuid, 'customers:read-all');
      
      const userNoPermUuid = await createUser('User No Perm', generateUniqueEmail());

      // Login all users to get their tokens
      const users = await dataSource.query(
        `SELECT uuid, email_address FROM users WHERE uuid IN (?, ?, ?, ?, ?, ?, ?)`,
        [userReadUuid, userReadAllUuid, userCreateUuid, userUpdateUuid, userUpdateAllUuid, userDeleteAllUuid, userNoPermUuid]
      );
      
      for (const user of users) {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email_address, password: 'password123' })
          .expect(201);
        
        if (user.uuid === userReadUuid) userReadToken = loginResponse.body.accessToken;
        else if (user.uuid === userReadAllUuid) userReadAllToken = loginResponse.body.accessToken;
        else if (user.uuid === userCreateUuid) userCreateToken = loginResponse.body.accessToken;
        else if (user.uuid === userUpdateUuid) userUpdateToken = loginResponse.body.accessToken;
        else if (user.uuid === userUpdateAllUuid) userUpdateAllToken = loginResponse.body.accessToken;
        else if (user.uuid === userDeleteAllUuid) userDeleteAllToken = loginResponse.body.accessToken;
        else if (user.uuid === userNoPermUuid) userNoPermissionToken = loginResponse.body.accessToken;
      }
    });
  });

  describe('READ - List Customers with Permissions', () => {
    describe('customers:read permission', () => {
      it('should return empty list (user created no customers)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .query({ page: 1, limit: 100 })
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(0); // User created no customers
      });
    });

    describe('customers:read-all permission', () => {
      it('should allow listing all customers from Salon 1', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userReadAllToken}`)
          .query({ page: 1, limit: 100 })
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        const customerUuids = response.body.data.map((c: any) => c.uuid);
        expect(customerUuids).toContain(customer1.uuid);
        expect(customerUuids).toContain(customer2.uuid);
      });

      it('should allow listing all customers from Salon 2', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/customers/${salon2Uuid}`)
          .set('Authorization', `Bearer ${userReadAllToken}`)
          .query({ page: 1, limit: 100 })
          .expect(200);

        expect(response.body.data).toBeDefined();
        const customerUuids = response.body.data.map((c: any) => c.uuid);
        expect(customerUuids).toContain(customer3.uuid);
      });

      it('should support pagination', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userReadAllToken}`)
          .query({ page: 1, limit: 1 })
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeLessThanOrEqual(1);
        expect(response.body.total).toBeDefined();
        expect(parseInt(response.body.page)).toBe(1);
        expect(parseInt(response.body.limit)).toBe(1);
      });
    });

    describe('No permission', () => {
      it('should NOT allow listing customers (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userNoPermissionToken}`)
          .query({ page: 1, limit: 100 })
          .expect(403);
      });
    });
  });

  describe('READ - Get Single Customer with Permissions', () => {
    describe('customers:read permission', () => {
      it('should NOT allow getting customers created by others (404)', async () => {
        // User with customers:read can only see customers they created
        // These customers were created by business owner, so should return 404
        await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .expect(404);
      });

      it('should allow getting customer they created', async () => {
        // First, create a customer as this user
        const response = await request(app.getHttpServer())
          .post(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userCreateToken}`)
          .send({
            email: generateUniqueEmail(),
            password: 'password123',
            name: 'Customer Created By User',
            phone: generateUniquePhone(),
            roleName: CUSTOMER_SALON_ROLE.STAFF
          })
          .expect(201);

        createdCustomerUuids.push(response.body.uuid);

        // Now user with customers:read should be able to get it if they have same UUID
        // But since userReadToken user didn't create it, they still can't see it
        await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}/${response.body.uuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .expect(404);
        
        // But userCreateToken (who created it) with customers:read can see it
        const getResponse = await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}/${response.body.uuid}`)
          .set('Authorization', `Bearer ${userCreateToken}`)
          .expect(200);

        expect(getResponse.body.uuid).toBe(response.body.uuid);
        expect(getResponse.body.name).toBe('Customer Created By User');
      });

      it('should return 404 for non-existent customer', async () => {
        const fakeUuid = uuid();
        await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}/${fakeUuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .expect(404);
      });
    });

    describe('customers:read-all permission', () => {
      it('should allow getting any customer details', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}/${customer2.uuid}`)
          .set('Authorization', `Bearer ${userReadAllToken}`)
          .expect(200);

        expect(response.body.uuid).toBe(customer2.uuid);
        expect(response.body.name).toBe(customer2.name);
      });

      it('should allow getting customer from any salon', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/customers/${salon2Uuid}/${customer3.uuid}`)
          .set('Authorization', `Bearer ${userReadAllToken}`)
          .expect(200);

        expect(response.body.uuid).toBe(customer3.uuid);
      });
    });

    describe('No permission', () => {
      it('should NOT allow getting customer details (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .get(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userNoPermissionToken}`)
          .expect(403);
      });
    });
  });

  describe('UPDATE - Modify Customers with Permissions', () => {
    describe('customers:update permission', () => {
      it('should allow updating customer they created', async () => {
        // First create a customer
        const createResponse = await request(app.getHttpServer())
          .post(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userUpdateToken}`)
          .send({
            email: generateUniqueEmail(),
            password: 'password123',
            name: 'Customer To Update',
            phone: generateUniquePhone(),
            roleName: CUSTOMER_SALON_ROLE.STAFF
          })
          .expect(201);

        createdCustomerUuids.push(createResponse.body.uuid);

        // Now update it
        const response = await request(app.getHttpServer())
          .patch(`/user/customers/${salon1Uuid}/${createResponse.body.uuid}`)
          .set('Authorization', `Bearer ${userUpdateToken}`)
          .send({ name: 'Updated Staff Name' })
          .expect(200);

        expect(response.body.name).toBe('Updated Staff Name');
      });

      it('should NOT allow updating customer created by others (404)', async () => {
        await request(app.getHttpServer())
          .patch(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userUpdateToken}`)
          .send({ name: 'Should Fail' })
          .expect(404);
      });

      it('should NOT allow updating without permission (403)', async () => {
        await request(app.getHttpServer())
          .patch(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .send({ name: 'Should Fail' })
          .expect(403);
      });
    });

    describe('customers:update-all permission', () => {
      it('should allow updating any customer across all salons', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/user/customers/${salon2Uuid}/${customer3.uuid}`)
          .set('Authorization', `Bearer ${userUpdateAllToken}`)
          .send({ name: 'Updated by Admin' })
          .expect(200);

        expect(response.body.name).toBe('Updated by Admin');
      });
    });

    describe('No permission', () => {
      it('should NOT allow updating customer (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .patch(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userNoPermissionToken}`)
          .send({ name: 'Should Fail' })
          .expect(403);
      });
    });
  });

  describe('DELETE - Remove Customers with Permissions', () => {
    describe('customers:delete-all permission', () => {
      it('should allow deleting customer from any salon', async () => {
        // Create a customer to delete
        const tempCustomer = await request(app.getHttpServer())
          .post(`/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${businessOwnerToken}`)
          .send({
            email: generateUniqueEmail(),
            password: 'password123',
            name: 'Temp Customer for Delete',
            phone: generateUniquePhone(),
            roleName: CUSTOMER_SALON_ROLE.STAFF
          })
          .expect(201);

        createdCustomerUuids.push(tempCustomer.body.uuid);

        await request(app.getHttpServer())
          .delete(`/user/customers/${salon1Uuid}/${tempCustomer.body.uuid}`)
          .set('Authorization', `Bearer ${userDeleteAllToken}`)
          .expect(200);
      });

      it('should return 404 for non-existent customer', async () => {
        const fakeUuid = uuid();
        await request(app.getHttpServer())
          .delete(`/user/customers/${salon1Uuid}/${fakeUuid}`)
          .set('Authorization', `Bearer ${userDeleteAllToken}`)
          .expect(404);
      });
    });

    describe('Without delete permission', () => {
      it('should NOT allow deleting customer (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .delete(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .expect(403);
      });

      it('should NOT allow deleting customer (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .delete(`/user/customers/${salon1Uuid}/${customer1.uuid}`)
          .set('Authorization', `Bearer ${userNoPermissionToken}`)
          .expect(403);
      });
    });
  });

  describe('CREATE - Add Customers with Permissions', () => {
    describe('customers:create permission', () => {
      it('should allow creating customer in salon', async () => {
        const response = await request(app.getHttpServer())
          .post(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userCreateToken}`)
          .send({
            email: generateUniqueEmail(),
            password: 'password123',
            name: 'New Customer by User',
            phone: generateUniquePhone(),
            roleName: CUSTOMER_SALON_ROLE.STAFF
          })
          .expect(201);

        expect(response.body.name).toBe('New Customer by User');
        createdCustomerUuids.push(response.body.uuid);
      });

      it('should validate required fields', async () => {
        await request(app.getHttpServer())
          .post(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userCreateToken}`)
          .send({
            email: generateUniqueEmail(),
            // Missing password, name, phone
          })
          .expect(400);
      });
    });

    describe('Without create permission', () => {
      it('should NOT allow creating customer (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .post(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userReadToken}`)
          .send({
            email: generateUniqueEmail(),
            password: 'password123',
            name: 'Should Fail',
            phone: generateUniquePhone(),
            roleName: CUSTOMER_SALON_ROLE.STAFF
          })
          .expect(403);
      });

      it('should NOT allow creating customer (403 Forbidden)', async () => {
        await request(app.getHttpServer())
          .post(`/user/customers/${salon1Uuid}`)
          .set('Authorization', `Bearer ${userNoPermissionToken}`)
          .send({
            email: generateUniqueEmail(),
            password: 'password123',
            name: 'Should Fail',
            phone: generateUniquePhone(),
            roleName: CUSTOMER_SALON_ROLE.STAFF
          })
          .expect(403);
      });
    });
  });

  describe('Edge Cases and Validation', () => {
    it('customers:read - should handle invalid salon UUID', async () => {
      await request(app.getHttpServer())
        .get(`/user/customers/invalid-uuid/${customer1.uuid}`)
        .set('Authorization', `Bearer ${userReadToken}`)
        .expect(400);
    });

    it('customers:read - should handle invalid customer UUID', async () => {
      await request(app.getHttpServer())
        .get(`/user/customers/${salon1Uuid}/invalid-uuid`)
        .set('Authorization', `Bearer ${userReadToken}`)
        .expect(400);
    });

    it('customers:read-all - should handle non-existent salon gracefully', async () => {
      const fakeSalonUuid = uuid();
      const response = await request(app.getHttpServer())
        .get(`/user/customers/${fakeSalonUuid}`)
        .set('Authorization', `Bearer ${userReadAllToken}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/user/customers/${salon1Uuid}`)
        .expect(401);
    });
  });
});
