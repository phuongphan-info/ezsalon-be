import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';

describe('Auth E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let accessToken: string;
  let moderatorAccessToken: string;
  let createdTestUser: any;
  
  const adminUser = {
    email: 'admin@ezsalon.com',
    password: 'admin123'
  };

  const moderatorUser = {
    email: 'moderator@ezsalon.com',
    password: 'moderator123'
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheService = moduleFixture.get<CacheService>(CacheService);
    
    await app.init();

    // Clear cache before tests
    await cacheService.reset();
  });

  afterAll(async () => {
    // Clean up test data and cache
    await cacheService.reset();
    await app.close();
  });

  describe('Auth E2E Flow', () => {
    it('1. LOGIN - should login with admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(adminUser.email);

      accessToken = response.body.accessToken;
    });

    it('2. ME - should get current admin user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // The response has user data nested under 'user' property
      const user = response.body.user || response.body;
      expect(user.email).toBe(adminUser.email);
      expect(user.name).toBe('System Administrator');
      
      // Should also return permissions
      expect(response.body).toHaveProperty('permissions');
      expect(Array.isArray(response.body.permissions)).toBe(true);
      // Admin should have permissions
      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('3. GET USERS - should get users list with admin permissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should return paginated results
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should contain at least the admin user
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Admin user should be in the results
      const adminUserInList = response.body.data.find((user: any) => user.email === adminUser.email);
      expect(adminUserInList).toBeDefined();
      expect(adminUserInList.name).toBe('System Administrator');
      expect(adminUserInList.email).toBe(adminUser.email);
      
      // Users should not contain password field
      response.body.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('uuid');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
      });
    });

    it('4. CREATE USER - should create a new user with admin permissions', async () => {
      const newUser = {
        email: `test-user-${uuid()}@ezsalon.io`,
        password: 'TestUser123!',
        name: 'Test User Created by Admin',
        phone: '+1234567890'
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newUser)
        .expect(201);

      // Verify the created user response
      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.phone).toBe(newUser.phone);
      
      // Password should not be in response
      expect(response.body).not.toHaveProperty('password');
      
      // Should have required fields
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('status');
      
      // Verify the user was actually created by checking the users list
      const usersListResponse = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      const createdUser = usersListResponse.body.data.find((user: any) => user.email === newUser.email);
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe(newUser.name);
      
      // Store created user for next test
      createdTestUser = response.body;
    });

    it('5. GET USERS UPDATED - should show updated users list including the new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should return paginated results
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should contain at least the admin user and the newly created user
      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      // Admin user should still be in the results
      const adminUserInList = response.body.data.find((user: any) => user.email === adminUser.email);
      expect(adminUserInList).toBeDefined();
      expect(adminUserInList.name).toBe('System Administrator');
      expect(adminUserInList.email).toBe(adminUser.email);
      
      // The newly created test user should be in the results
      const testUserInList = response.body.data.find((user: any) => user.uuid === createdTestUser.uuid);
      expect(testUserInList).toBeDefined();
      expect(testUserInList.email).toBe(createdTestUser.email);
      expect(testUserInList.name).toBe(createdTestUser.name);
      expect(testUserInList.phone).toBe(createdTestUser.phone);
      
      // Verify that the new user was created by the admin user (flattened fields)
      expect(testUserInList).toHaveProperty('createdByUuid');
      expect(testUserInList).toHaveProperty('createdByName');
      expect(testUserInList.createdByUuid).toBe(adminUserInList.uuid);
      expect(testUserInList.createdByName).toBe('System Administrator');
      
      // Verify the users are properly ordered (most recent first)
      const testUserIndex = response.body.data.findIndex((user: any) => user.uuid === createdTestUser.uuid);
      const adminUserIndex = response.body.data.findIndex((user: any) => user.email === adminUser.email);
      
      // Test user should appear before admin user (created more recently)
      expect(testUserIndex).toBeLessThan(adminUserIndex);
      
      // All users should not contain password field
      response.body.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('uuid');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('updatedAt');
      });
    });

    it('6. UPDATE USER ROLE - should update the new user role to Moderator', async () => {
      // Update the created test user's role to moderator
      const updateUserDto = {
        role: 'moderator'
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${createdTestUser.uuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateUserDto)
        .expect(200);

      // Verify the updated user response
      expect(response.body).toHaveProperty('uuid');
      expect(response.body.uuid).toBe(createdTestUser.uuid);
      expect(response.body.email).toBe(createdTestUser.email);
      expect(response.body.name).toBe(createdTestUser.name);
      
      // Password should not be in response
      expect(response.body).not.toHaveProperty('password');
      
      // Role should be updated (flattened fields) - update response returns roleUuid only
      expect(response.body).toHaveProperty('roleUuid');
      
      // Verify the user was actually updated by checking the users list
      const usersListResponse = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      const updatedUser = usersListResponse.body.data.find((user: any) => user.uuid === createdTestUser.uuid);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.roleUuid).toBeDefined();
      expect(updatedUser.roleName).toBe('moderator');
          
      // Update the createdTestUser for subsequent tests
      createdTestUser = response.body;
    });

    it('7. NEW MODERATOR LOGIN AND LIST - should login with updated user (now moderator role) and see limited users', async () => {
      // Login with the user we just updated to moderator role
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: createdTestUser.email,
          password: 'TestUser123!' // This is the password from when the user was created
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.email).toBe(createdTestUser.email);
      // Login response does not include role fields (flattened minimal); proceed without role assertions

      moderatorAccessToken = loginResponse.body.accessToken;

      // Get users list as the newly promoted moderator
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      // Should return paginated results
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // This user (now moderator) has users:read permission (not users:read-all), 
      // so they can only see users they created themselves
      // Since this user hasn't created any users, the list should be empty
      expect(response.body.total).toBe(0);
      expect(response.body.data.length).toBe(0);
      
      // No users should be visible because this moderator hasn't created any users yet
      const adminUserInList = response.body.data.find((user: any) => user.email === adminUser.email);
      expect(adminUserInList).toBeUndefined();
      
      const originalModeratorInList = response.body.data.find((user: any) => user.email === moderatorUser.email);
      expect(originalModeratorInList).toBeUndefined();
    });

    it('8. NEW MODERATOR CREATE USER - should create new user and see it in list', async () => {
      const newModeratorUser = {
        email: `new-moderator-user-${uuid()}@ezsalon.io`,
        password: 'NewModeratorUser123!',
        name: 'User Created by New Moderator',
        phone: '+1234567892'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .send(newModeratorUser)
        .expect(201);

      // Verify the created user response
      expect(createResponse.body).toHaveProperty('uuid');
      expect(createResponse.body.email).toBe(newModeratorUser.email);
      expect(createResponse.body.name).toBe(newModeratorUser.name);
      expect(createResponse.body.phone).toBe(newModeratorUser.phone);
      expect(createResponse.body).not.toHaveProperty('password');

      // Now get users list as the new moderator - should see the user they created
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      // Should return paginated results with the new user
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(1);
      expect(response.body.data.length).toBe(1);
      
      // The newly created user should be in the results
      const createdUserInList = response.body.data[0];
      expect(createdUserInList.uuid).toBe(createResponse.body.uuid);
      expect(createdUserInList.email).toBe(newModeratorUser.email);
      expect(createdUserInList.name).toBe(newModeratorUser.name);
      expect(createdUserInList.phone).toBe(newModeratorUser.phone);
      
      // Verify that the new user was created by the new moderator (flattened fields)
      expect(createdUserInList).toHaveProperty('createdByUuid');
      expect(createdUserInList).toHaveProperty('createdByName');
      expect(createdUserInList.createdByUuid).toBe(createdTestUser.uuid);
      expect(createdUserInList.createdByName).toBe(createdTestUser.name);
      
      // Admin-created users should still NOT be visible to this moderator
      const adminUserInList = response.body.data.find((user: any) => user.email === adminUser.email);
      expect(adminUserInList).toBeUndefined();
      
      const originalModeratorInList = response.body.data.find((user: any) => user.email === moderatorUser.email);
      expect(originalModeratorInList).toBeUndefined();
      
      // User should not contain password field
      expect(createdUserInList).not.toHaveProperty('password');
      expect(createdUserInList).toHaveProperty('uuid');
      expect(createdUserInList).toHaveProperty('email');
      expect(createdUserInList).toHaveProperty('name');
      expect(createdUserInList).toHaveProperty('createdAt');
      expect(createdUserInList).toHaveProperty('updatedAt');
    });

    it('9. DELETE USER - should delete the created test user using admin token after cleaning children', async () => {
      // First, get the users created by our test moderator and delete them
      const usersCreatedByModeratorResponse = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${moderatorAccessToken}`)
        .expect(200);

      // Delete all users created by the moderator first (to avoid FK constraints)
      for (const user of usersCreatedByModeratorResponse.body.data) {
        await request(app.getHttpServer())
          .delete(`/users/${user.uuid}`)
          .set('Authorization', `Bearer ${moderatorAccessToken}`)
          .expect(200);
      }

      // Get potential child users created by this test user (using admin rights to view all)
      const childUsersResponse = await request(app.getHttpServer())
        .get(`/users?page=1&limit=50&createdByUuid=${createdTestUser.uuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      for (const child of childUsersResponse.body.data) {
        await request(app.getHttpServer())
          .delete(`/users/${child.uuid}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect((res) => {
            if (res.status !== 200) {
              throw new Error(`Failed to delete child user ${child.uuid}, status ${res.status}`);
            }
          });
      }

      // Attempt delete of parent user
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/users/${createdTestUser.uuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deleteResponse.body).toEqual({});
    });

    it('10. PROTECTED ADMIN - should not be able to delete admin user', async () => {
      // First get the admin user UUID from the me endpoint
      const meResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      const adminUuid = meResponse.body.user.uuid;

      // Try to delete the admin user - should fail due to protection
      const response = await request(app.getHttpServer())
        .delete(`/users/${adminUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.message).toContain('Cannot delete protected admin');
    });
  });
});
