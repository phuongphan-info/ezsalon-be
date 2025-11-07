import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';
import { CUSTOMER_STATUS } from '../src/customers/entities/customer.entity';
import { CUSTOMER_SALON_ROLE } from '../src/customers/entities/customer-salon.entity';

describe('Customers By Business Owner E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let dataSource: DataSource;

  // Track created resources for cleanup
  const createdCustomerUuids: string[] = [];
  const createdSalonUuids: string[] = [];

  // Helper function to generate unique email
  const generateUniqueEmail = () => `test-${Date.now()}-${uuid()}@ezsalon.io`;
  
  // Helper function to generate unique phone number
  const generateUniquePhone = () => `+84${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  // Helper function to activate customer
  const activateCustomer = async (customerUuid: string) => {
    await dataSource.query(
      'UPDATE customers SET status = ? WHERE uuid = ?',
      [CUSTOMER_STATUS.ACTIVED, customerUuid]
    );
  };

  // Test users with different roles
  let businessOwner1: any;
  let businessOwner2: any;

  // Tokens
  let businessOwner1Token: string;
  let businessOwner2Token: string;
  let owner1Token: string;
  let manager1Token: string;
  let frontDesk1Token: string;
  let staff1Token: string;

  // Salons
  let salon1Uuid: string;
  let salon2Uuid: string;

  // Test customers in salon1
  let salon1Owner: any;
  let salon1Manager: any;
  let salon1FrontDesk: any;
  let salon1Staff: any;

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
    // Cleanup: Delete all created customers
    for (const uuid of createdCustomerUuids) {
      try {
        await dataSource.query('DELETE FROM customers WHERE uuid = ?', [uuid]);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    await cacheService.reset();
    await app.close();
  });

  describe('Setup: Create test users and salons', () => {
    it('1. Create Business Owner 1 and Salon 1', async () => {
      // Register Business Owner 1
      const response = await request(app.getHttpServer())
        .post('/customers/register')
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Business Owner 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.BUSINESS_OWNER
        });

      expect(response.status).toBe(201);

      businessOwner1 = response.body.customer;
      createdCustomerUuids.push(businessOwner1.uuid);
      
      // Activate and login
      await activateCustomer(businessOwner1.uuid);
      
      const loginResponse = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: businessOwner1.email,
          password: 'password123'
        })
        .expect(200);

      businessOwner1Token = loginResponse.body.accessToken;

      // Create Salon 1
      const salonResponse = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${businessOwner1Token}`)
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

    it('2. Create Business Owner 2 and Salon 2 (Different salon)', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers/register')
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Business Owner 2',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.BUSINESS_OWNER
        })
        .expect(201);

      businessOwner2 = response.body.customer;
      createdCustomerUuids.push(businessOwner2.uuid);
      
      await activateCustomer(businessOwner2.uuid);
      
      const loginResponse = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: businessOwner2.email,
          password: 'password123'
        })
        .expect(200);

      businessOwner2Token = loginResponse.body.accessToken;

      // Create Salon 2
      const salonResponse = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${businessOwner2Token}`)
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

    it('3. Create staff members in Salon 1 with different roles', async () => {
      // Create Owner
      const ownerResponse = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Owner 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.OWNER
        })
        .expect(201);

      salon1Owner = ownerResponse.body;
      createdCustomerUuids.push(salon1Owner.uuid);

      // Create Manager
      const managerResponse = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Manager 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.MANAGER
        })
        .expect(201);

      salon1Manager = managerResponse.body;
      createdCustomerUuids.push(salon1Manager.uuid);

      // Create Front Desk
      const frontDeskResponse = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Front Desk 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.FRONT_DESK
        })
        .expect(201);

      salon1FrontDesk = frontDeskResponse.body;
      createdCustomerUuids.push(salon1FrontDesk.uuid);

      // Create Staff
      const staffResponse = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Staff 1',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      salon1Staff = staffResponse.body;
      createdCustomerUuids.push(salon1Staff.uuid);
    });

    it('4. Login all staff members', async () => {
      // Activate all staff members
      await activateCustomer(salon1Owner.uuid);
      await activateCustomer(salon1Manager.uuid);
      await activateCustomer(salon1FrontDesk.uuid);
      await activateCustomer(salon1Staff.uuid);

      // Login as Owner
      const ownerLogin = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: salon1Owner.email, password: 'password123' })
        .expect(200);
      owner1Token = ownerLogin.body.accessToken;

      // Login as Manager
      const managerLogin = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: salon1Manager.email, password: 'password123' })
        .expect(200);
      manager1Token = managerLogin.body.accessToken;

      // Login as Front Desk
      const frontDeskLogin = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: salon1FrontDesk.email, password: 'password123' })
        .expect(200);
      frontDesk1Token = frontDeskLogin.body.accessToken;

      // Login as Staff
      const staffLogin = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: salon1Staff.email, password: 'password123' })
        .expect(200);
      staff1Token = staffLogin.body.accessToken;
    });
  });

  describe('READ - List Customers with Role-Based Filtering', () => {
    it('Business Owner can see all customers except other Business Owners', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should see Owner, Manager, Front Desk, Staff but not Business Owner
      const customerUuids = response.body.data.map((c: any) => c.uuid);
      expect(customerUuids).toContain(salon1Owner.uuid);
      expect(customerUuids).toContain(salon1Manager.uuid);
      expect(customerUuids).toContain(salon1FrontDesk.uuid);
      expect(customerUuids).toContain(salon1Staff.uuid);

      // Should NOT see other business owners
      expect(customerUuids).not.toContain(businessOwner2.uuid);
    });

    it('Owner can see all roles except Business Owner and Owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      const customerUuids = response.body.data.map((c: any) => c.uuid);
      
      // Should see Manager, Front Desk, Staff
      expect(customerUuids).toContain(salon1Manager.uuid);
      expect(customerUuids).toContain(salon1FrontDesk.uuid);
      expect(customerUuids).toContain(salon1Staff.uuid);

      // Should NOT see Business Owner or other Owners
      expect(customerUuids).not.toContain(businessOwner1.uuid);
      expect(customerUuids).not.toContain(salon1Owner.uuid);
    });

    it('Manager can only see Front Desk and Staff', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      const customerUuids = response.body.data.map((c: any) => c.uuid);
      
      // Should only see Front Desk and Staff
      expect(customerUuids).toContain(salon1FrontDesk.uuid);
      expect(customerUuids).toContain(salon1Staff.uuid);

      // Should NOT see Business Owner, Owner, or Manager
      expect(customerUuids).not.toContain(businessOwner1.uuid);
      expect(customerUuids).not.toContain(salon1Owner.uuid);
      expect(customerUuids).not.toContain(salon1Manager.uuid);
    });

    it('Front Desk and Staff cannot list customers', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${frontDesk1Token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .expect(403);
    });

    it('Business Owner from Salon 2 cannot see Salon 1 customers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner2Token}`)
        .query({ page: 1, limit: 100 })
        .expect(403);
    });
  });

  describe('READ - Get Single Customer with Role-Based Access', () => {
    it('Business Owner can get details of their salon customers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .expect(200);

      expect(response.body.uuid).toBe(salon1Staff.uuid);
      expect(response.body.name).toBe(salon1Staff.name);
    });

    it('Owner can get details of Manager, Front Desk, Staff', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Manager.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1FrontDesk.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);
    });

    it('Manager can get details of Front Desk and Staff only', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1FrontDesk.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .expect(200);

      // Cannot access Owner
      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Owner.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .expect(403);
    });

    it('Business Owner from different salon cannot access customers', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${businessOwner2Token}`)
        .expect(403);
    });

    it('Staff cannot get customer details', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}/${salon1Manager.uuid}`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .expect(403);
    });
  });

  describe('CREATE - Add Customers with Role-Based Permissions', () => {
    let newStaffUuid: string;

    it('Business Owner can create customers with any role except Business Owner', async () => {
      const response = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'New Staff by BO',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      newStaffUuid = response.body.uuid;
      createdCustomerUuids.push(newStaffUuid);
      expect(response.body.name).toBe('New Staff by BO');
    });

    it('Owner can create Manager, Front Desk, Staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'New Staff by Owner',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      createdCustomerUuids.push(response.body.uuid);
      expect(response.body.name).toBe('New Staff by Owner');
    });

    it('Owner cannot create Business Owner or Owner', async () => {
      await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Should Fail',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.OWNER
        })
        .expect(403);
    });

    it('Manager cannot create customers', async () => {
      await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Should Fail',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(403);
    });

    it('Business Owner from different salon cannot create in Salon 1', async () => {
      await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner2Token}`)
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

  describe('UPDATE - Modify Customers with Role-Based Permissions', () => {
    it('Business Owner can update their salon customers', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({ name: 'Updated by Business Owner' })
        .expect(200);

      expect(response.body.name).toBe('Updated by Business Owner');
    });

    it('Owner can update Manager, Front Desk, Staff', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${salon1Uuid}/${salon1Manager.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ name: 'Updated Manager by Owner' })
        .expect(200);

      expect(response.body.name).toBe('Updated Manager by Owner');
    });

    it('Manager can update Front Desk and Staff', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ name: 'Updated Staff by Manager' })
        .expect(200);

      expect(response.body.name).toBe('Updated Staff by Manager');
    });

    it('Manager cannot update Owner', async () => {
      await request(app.getHttpServer())
        .patch(`/customers/${salon1Uuid}/${salon1Owner.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({ name: 'Should Fail' })
        .expect(403);
    });

    it('Business Owner from different salon cannot update', async () => {
      await request(app.getHttpServer())
        .patch(`/customers/${salon1Uuid}/${salon1Staff.uuid}`)
        .set('Authorization', `Bearer ${businessOwner2Token}`)
        .send({ name: 'Should Fail' })
        .expect(403);
    });

    it('Staff cannot update customers', async () => {
      await request(app.getHttpServer())
        .patch(`/customers/${salon1Uuid}/${salon1FrontDesk.uuid}`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ name: 'Should Fail' })
        .expect(403);
    });
  });

  describe('DELETE - Remove Customers with Role-Based Permissions', () => {
    let customerToDelete: any;

    beforeEach(async () => {
      // Create a customer to delete in each test
      const response = await request(app.getHttpServer())
        .post(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'To Be Deleted',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      customerToDelete = response.body;
      createdCustomerUuids.push(customerToDelete.uuid);
    });

    it('Business Owner can delete their salon customers', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${customerToDelete.uuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .expect(200);

      // Remove from cleanup array since already deleted
      const index = createdCustomerUuids.indexOf(customerToDelete.uuid);
      if (index > -1) createdCustomerUuids.splice(index, 1);
    });

    it('Owner can delete Manager, Front Desk, Staff', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${customerToDelete.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      const index = createdCustomerUuids.indexOf(customerToDelete.uuid);
      if (index > -1) createdCustomerUuids.splice(index, 1);
    });

    it('Manager can delete Front Desk and Staff', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${customerToDelete.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .expect(200);

      const index = createdCustomerUuids.indexOf(customerToDelete.uuid);
      if (index > -1) createdCustomerUuids.splice(index, 1);
    });

    it('Manager cannot delete Owner', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${salon1Owner.uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .expect(403);
    });

    it('Business Owner from different salon cannot delete', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${customerToDelete.uuid}`)
        .set('Authorization', `Bearer ${businessOwner2Token}`)
        .send({ name: 'Should Fail' })
        .expect(403);
    });

    it('Staff cannot delete customers', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${customerToDelete.uuid}`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .expect(403);
    });

    it('Cannot delete non-existent customer', async () => {
      const fakeUuid = uuid();
      await request(app.getHttpServer())
        .delete(`/customers/${salon1Uuid}/${fakeUuid}`)
        .set('Authorization', `Bearer ${businessOwner1Token}`)
        .expect(404);
    });
  });

  describe('Cross-Salon Access Prevention', () => {
    it('Owner from Salon 1 cannot access Salon 2 customers', async () => {
      // Create a customer in Salon 2
      const salon2Customer = await request(app.getHttpServer())
        .post(`/customers/${salon2Uuid}`)
        .set('Authorization', `Bearer ${businessOwner2Token}`)
        .send({
          email: generateUniqueEmail(),
          password: 'password123',
          name: 'Salon 2 Customer',
          phone: generateUniquePhone(),
          roleName: CUSTOMER_SALON_ROLE.STAFF
        })
        .expect(201);

      createdCustomerUuids.push(salon2Customer.body.uuid);

      // Try to access from Salon 1 Owner - should fail
      await request(app.getHttpServer())
        .get(`/customers/${salon2Uuid}/${salon2Customer.body.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(403);

      // Try to update from Salon 1 Owner - should fail
      await request(app.getHttpServer())
        .patch(`/customers/${salon2Uuid}/${salon2Customer.body.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ name: 'Should Fail' })
        .expect(403);

      // Try to delete from Salon 1 Owner - should fail
      await request(app.getHttpServer())
        .delete(`/customers/${salon2Uuid}/${salon2Customer.body.uuid}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(403);
    });

    it('Manager from Salon 1 cannot list or access Salon 2 customers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${salon1Uuid}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      // Manager should only see FRONT_DESK and STAFF roles
      // Check that all returned customers have the correct roles
      const allCustomersHaveCorrectRoles = response.body.data.every((customer: any) => {
        return ['FRONT_DESK', 'STAFF'].includes(customer.roleName);
      });

      expect(allCustomersHaveCorrectRoles).toBe(true);
      
      // Verify we can see the specific Salon 1 customers
      const customerUuids = response.body.data.map((c: any) => c.uuid);
      expect(customerUuids).toContain(salon1FrontDesk.uuid);
      expect(customerUuids).toContain(salon1Staff.uuid);
      
      // Should NOT contain any higher roles
      expect(customerUuids).not.toContain(salon1Owner.uuid);
      expect(customerUuids).not.toContain(salon1Manager.uuid);
      expect(customerUuids).not.toContain(businessOwner1.uuid);
    });
  });
});
