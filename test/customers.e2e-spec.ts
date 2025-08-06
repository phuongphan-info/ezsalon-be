import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';
import { CustomersService } from '../src/customers/customers.service';
import { CUSTOMER_STATUS } from '../src/customers/entities/customer.entity';

describe('Customers E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let customersService: CustomersService;
  let dataSource: DataSource;
  let accessToken: string;
  let testCustomerUuid: string;
  let salonUuid: string;
  let managerCustomerUuid: string;
  let managerCustomerEmail: string;
  let staffCustomerEmail: string;
  let staffCustomerUuid: string;
  let unassignedStaffCustomerEmail: string;
  let unassignedStaffCustomerUuid: string;

  // Array to collect all created test customer UUIDs for cleanup
  const createdCustomerUuids: string[] = [];
  
  const generateUniqueEmail = () => `test-e2e-${Date.now()}-${uuid()}@ezsalon.io`;
  
  let testCustomer = {
    email: generateUniqueEmail(),
    password: 'TestPassword123!',
    name: 'Test E2E Customer',
    phone: '+84987654321'
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheService = moduleFixture.get<CacheService>(CacheService);
    customersService = moduleFixture.get<CustomersService>(CustomersService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    await app.init();

    // Clear cache before tests
    await cacheService.reset();

    // Generate fresh unique customer data
    testCustomer = {
      email: generateUniqueEmail(),
      password: 'TestPassword123!',
      name: 'Test E2E Customer',
      phone: '+84987654321'
    };
  });



  /**
   * Delete all tracked test customers
   */
  const cleanupAllTestCustomers = async () => {
    try {
      let deletedCount = 0;
      
      // Delete each tracked customer using the service
      for (const uuid of createdCustomerUuids) {
        try {
          await customersService.remove(uuid);
          deletedCount++;
        } catch (error) {
        }
      }
    } catch (error) {
    }
  };

  afterAll(async () => {
    // Delete all test customers
    await cleanupAllTestCustomers();
    
    // Clear cache and close app
    await cacheService.reset();
    await app.close();
  });

  describe('Customer E2E Flow', () => {
    it('1. REGISTER - should register a new owner customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers/register')
        .send(testCustomer)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(testCustomer.email);
      expect(response.body.name).toBe(testCustomer.name);
      expect(response.body.phone).toBe(testCustomer.phone);
      expect(response.body.status).toBe(CUSTOMER_STATUS.PENDING);

      testCustomerUuid = response.body.uuid;
      createdCustomerUuids.push(testCustomerUuid);
    });

    it('2. LOGIN - should login with registered owner customer', async () => {
      // First activate the customer for login
      await customersService.update(testCustomerUuid, {
        status: CUSTOMER_STATUS.ACTIVED
      });

      const response = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: testCustomer.email,
          password: testCustomer.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('customer');
      expect(response.body.customer.email).toBe(testCustomer.email);

      accessToken = response.body.accessToken;
    });

    it('3. PROFILE - should get owner customer profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${testCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.uuid).toBe(testCustomerUuid);
      expect(response.body.email).toBe(testCustomer.email);
      expect(response.body.name).toBe(testCustomer.name);
      expect(response.body.phone).toBe(testCustomer.phone);
    });

    it('3.1. CREATE CUSTOMER - should create a new customer', async () => {
      // First test: GET /customers should return no customers initially
      const initialResponse = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(initialResponse.body).toHaveProperty('data');
      expect(initialResponse.body).toHaveProperty('total');
      expect(initialResponse.body.total).toBe(0);
      expect(initialResponse.body.data).toHaveLength(0);

      // Second test: Create a new staff customer (not belonging to any salon)
      const newCustomerData = {
        email: generateUniqueEmail(),
        password: 'TestPassword123!',
        name: 'Test New Staff Customer',
        phone: '+84987654322'
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newCustomerData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(newCustomerData.email);
      expect(response.body.name).toBe(newCustomerData.name);
      expect(response.body.phone).toBe(newCustomerData.phone);
      // Verify customer doesn't belong to any salon initially
      expect(response.body).not.toHaveProperty('salonUuid');

      unassignedStaffCustomerEmail = newCustomerData.email;
      unassignedStaffCustomerUuid = response.body.uuid;
      createdCustomerUuids.push(unassignedStaffCustomerUuid);
    });

    it('3.1.1. GET CUSTOMERS - should have only 0 customer in list', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });

    it('3.2. CREATE SALON - should create a new salon', async () => {
      const salonData = {
        name: 'Test E2E Salon',
        address: '123 Test Street, Test City',
        phone: '+84123456789',
        email: 'testsalon@ezsalon.io',
        description: 'A test salon for e2e testing'
      };

      const response = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(salonData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.name).toBe(salonData.name);
      expect(response.body.address).toBe(salonData.address);
      expect(response.body.phone).toBe(salonData.phone);
      expect(response.body.email).toBe(salonData.email);
      expect(response.body.description).toBe(salonData.description);

      salonUuid = response.body.uuid;
    });

    it('3.3. CREATE STAFF CUSTOMER - should create a new customer with salon and STAFF role', async () => {
      const staffCustomerData = {
        email: generateUniqueEmail(),
        password: 'TestPassword123!',
        name: 'Test Staff Customer',
        phone: '+84987654324',
        salonUuid: salonUuid,
        customerRoleName: 'STAFF'
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(staffCustomerData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(staffCustomerData.email);
      expect(response.body.name).toBe(staffCustomerData.name);
      expect(response.body.phone).toBe(staffCustomerData.phone);

      staffCustomerUuid = response.body.uuid;
      staffCustomerEmail = staffCustomerData.email;
      createdCustomerUuids.push(staffCustomerUuid);
    });

    it('3.3.1. GET CUSTOMERS - should have only 1 customer in list', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].uuid).toBe(staffCustomerUuid);
    });

    it('3.3.2 CREATE MANAGER CUSTOMER - should create a new customer with salon and MANAGER role', async () => {
      const managerCustomerData = {
        email: generateUniqueEmail(),
        password: 'TestPassword123!',
        name: 'Test Manager Customer',
        phone: '+84987654323',
        salonUuid: salonUuid,
        customerRoleName: 'MANAGER'
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(managerCustomerData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.email).toBe(managerCustomerData.email);
      expect(response.body.name).toBe(managerCustomerData.name);
      expect(response.body.phone).toBe(managerCustomerData.phone);

      managerCustomerUuid = response.body.uuid;
      managerCustomerEmail = managerCustomerData.email;
      createdCustomerUuids.push(managerCustomerUuid);
    });

    it('3.3.3. VERIFY CUSTOMERS COUNT - should have 2 customers (1 staff + 1 manager)', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
        
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(2);
      expect(response.body.data).toHaveLength(2);

      // Verify we have the expected customers
      const customerUuids = response.body.data.map(customer => customer.uuid);
      expect(customerUuids).toContain(staffCustomerUuid);
      expect(customerUuids).toContain(managerCustomerUuid);
    });

    it('3.4. LOGIN AS MANAGER - should login with manager customer and verify salon access', async () => {
      // First activate the manager customer for login
      await customersService.update(managerCustomerUuid, {
        status: CUSTOMER_STATUS.ACTIVED
      });

      // Login with manager customer
      const loginResponse = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: managerCustomerEmail,
          password: 'TestPassword123!'
        })
        .expect(200);

      const managerAccessToken = loginResponse.body.accessToken;

      // Get salons as manager customer
      const salonsResponse = await request(app.getHttpServer())
        .get('/salons?page=1&limit=10')
        .set('Authorization', `Bearer ${managerAccessToken}`)
        .expect(200);

      expect(salonsResponse.body).toHaveProperty('data');
      expect(salonsResponse.body).toHaveProperty('total');
      expect(salonsResponse.body.total).toBe(1);
      expect(salonsResponse.body.data).toHaveLength(1);
      expect(salonsResponse.body.data[0].uuid).toBe(salonUuid);
      expect(salonsResponse.body.data[0].name).toBe('Test E2E Salon');
    });

    it('3.5. LOGIN AS STAFF - should login with staff customer and verify salon access', async () => {
      // First activate the staff customer for login
      await customersService.update(staffCustomerUuid, {
        status: CUSTOMER_STATUS.ACTIVED
      });

      // Login with staff customer
      const loginResponse = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: staffCustomerEmail,
          password: 'TestPassword123!'
        })
        .expect(200);

      const staffAccessToken = loginResponse.body.accessToken;

      // Get salons as staff customer
      const salonsResponse = await request(app.getHttpServer())
        .get('/salons?page=1&limit=10')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .expect(200);

      expect(salonsResponse.body).toHaveProperty('data');
      expect(salonsResponse.body).toHaveProperty('total');
      
      // Staff customer should have access to the salon they belong to
      expect(salonsResponse.body.total).toBe(1);
      expect(salonsResponse.body.data).toHaveLength(1);
      expect(salonsResponse.body.data[0].uuid).toBe(salonUuid);
      expect(salonsResponse.body.data[0].name).toBe('Test E2E Salon');
    });

    it('3.6. LOGIN AS UNASSIGNED CUSTOMER - should login with customer who has no salon assignment', async () => {
      // First activate the unassigned staff customer for login
      await customersService.update(unassignedStaffCustomerUuid, {
        status: CUSTOMER_STATUS.ACTIVED
      });

      // Login with unassigned staff customer
      const loginResponse = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: unassignedStaffCustomerEmail,
          password: 'TestPassword123!'
        })
        .expect(200);

      const unassignedAccessToken = loginResponse.body.accessToken;

      // Get salons as unassigned customer
      const salonsResponse = await request(app.getHttpServer())
        .get('/salons?page=1&limit=10')
        .set('Authorization', `Bearer ${unassignedAccessToken}`)
        .expect(200);

      expect(salonsResponse.body).toHaveProperty('data');
      expect(salonsResponse.body).toHaveProperty('total');
      
      // Unassigned customer should have no access to any salons
      expect(salonsResponse.body.total).toBe(0);
      expect(salonsResponse.body.data).toHaveLength(0);
    });

    it('3.7. ASSIGN CUSTOMER TO SALON - should add unassigned customer to salon with STAFF role', async () => {
      const customerSalonData = {
        customerUuid: unassignedStaffCustomerUuid,
        salonUuid: salonUuid,
        roleName: 'STAFF'
      };

      const response = await request(app.getHttpServer())
        .post('/customer-salons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(customerSalonData)
        .expect(201);

      expect(response.body).toHaveProperty('uuid');
      expect(response.body.customerUuid).toBe(unassignedStaffCustomerUuid);
      expect(response.body.salonUuid).toBe(salonUuid);
      expect(response.body.roleName).toBe('STAFF');
    });

    it('3.8. VERIFY SALON ACCESS AFTER ASSIGNMENT - should verify previously unassigned customer now has salon access', async () => {
      // Login with the previously unassigned customer
      const loginResponse = await request(app.getHttpServer())
        .post('/customers/login')
        .send({
          email: unassignedStaffCustomerEmail,
          password: 'TestPassword123!'
        })
        .expect(200);

      const previouslyUnassignedAccessToken = loginResponse.body.accessToken;

      // Get salons as previously unassigned customer (now assigned)
      const salonsResponse = await request(app.getHttpServer())
        .get('/salons?page=1&limit=10')
        .set('Authorization', `Bearer ${previouslyUnassignedAccessToken}`)
        .expect(200);

      expect(salonsResponse.body).toHaveProperty('data');
      expect(salonsResponse.body).toHaveProperty('total');
      
      // Previously unassigned customer should now have access to the salon
      expect(salonsResponse.body.total).toBe(1);
      expect(salonsResponse.body.data).toHaveLength(1);
      expect(salonsResponse.body.data[0].uuid).toBe(salonUuid);
      expect(salonsResponse.body.data[0].name).toBe('Test E2E Salon');

    });

    it('3.9. VERIFY SYSTEM PREVENTS MULTIPLE ROLES - should prevent adding multiple roles to same customer-salon pair', async () => {
      // First verify the customer currently has STAFF role
      const getRelationshipResponse = await request(app.getHttpServer())
        .get(`/customer-salons/${salonUuid}/${unassignedStaffCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRelationshipResponse.body).toHaveProperty('uuid');
      expect(getRelationshipResponse.body.roleName).toBe('STAFF');
      
      // Try to add MANAGER role using POST (should fail with 409 Conflict)
      const customerSalonData = {
        customerUuid: unassignedStaffCustomerUuid,
        salonUuid: salonUuid,
        roleName: 'MANAGER'
      };

      const response = await request(app.getHttpServer())
        .post('/customer-salons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(customerSalonData)
        .expect(409);

      expect(response.body.message).toBe('Customer-Salon relationship already exists');
      expect(response.body.statusCode).toBe(409);

      // Verify the original STAFF role is still there
      const verifyResponse = await request(app.getHttpServer())
        .get(`/customer-salons/${salonUuid}/${unassignedStaffCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(verifyResponse.body.roleName).toBe('STAFF');
    });

    it('3.9.1. UPDATE STAFF TO MANAGER ROLE - should update staff customer role to manager', async () => {
      // First verify the customer currently has STAFF role
      const getCurrentRelationshipResponse = await request(app.getHttpServer())
        .get(`/customer-salons/${salonUuid}/${unassignedStaffCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getCurrentRelationshipResponse.body.roleName).toBe('STAFF');

      // Update the role from STAFF to MANAGER using PATCH endpoint
      const updateData = {
        roleName: 'MANAGER'
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/customer-salons/${salonUuid}/${unassignedStaffCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body).toHaveProperty('uuid');
      expect(updateResponse.body.customerUuid).toBe(unassignedStaffCustomerUuid);
      expect(updateResponse.body.salonUuid).toBe(salonUuid);
      expect(updateResponse.body.roleName).toBe('MANAGER');

      // Verify the role has been updated
      const verifyUpdateResponse = await request(app.getHttpServer())
        .get(`/customer-salons/${salonUuid}/${unassignedStaffCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(verifyUpdateResponse.body.roleName).toBe('MANAGER');
    });

    it('3.10. VERIFY CUSTOMER ROLES - should verify each customer has one role', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(3);
      expect(response.body.data).toHaveLength(3);

      // Find customers and verify roles
      const customers = response.body.data;
      const staffCustomer = customers.find(c => c.uuid === staffCustomerUuid);
      const managerCustomer = customers.find(c => c.uuid === managerCustomerUuid);
      const testCustomer = customers.find(c => c.uuid === unassignedStaffCustomerUuid);

      expect(staffCustomer).toBeDefined();
      expect(staffCustomer.role).toBe('STAFF');

      expect(managerCustomer).toBeDefined();
      expect(managerCustomer.role).toBe('MANAGER');

      expect(testCustomer).toBeDefined();
      expect(testCustomer.role).toBe('MANAGER');
    });

    it('4. DELETE - should delete the customer', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${testCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Remove from tracking array since it's already deleted
      const index = createdCustomerUuids.indexOf(testCustomerUuid);
      if (index > -1) {
        createdCustomerUuids.splice(index, 1);
      }
      testCustomerUuid = null;
    });
  });

  describe('Role-based customer and salon permissions', () => {
    let businessOwner = {
      email: generateUniqueEmail(),
      password: 'Owner123!',
      name: 'Business Owner',
      phone: '+84999999999'
    };
    let owner = {
      email: generateUniqueEmail(),
      password: 'Owner123!',
      name: 'Owner',
      phone: '+84999999998'
    };
    let manager = {
      email: generateUniqueEmail(),
      password: 'Manager123!',
      name: 'Manager',
      phone: '+84999999997'
    };
    let boToken: string;
    let ownerToken: string;
    let managerToken: string;
    let salonId: string;
    let boCustomerId: string;
    let ownerCustomerId: string;
    let managerCustomerId: string;
    let unassignedCustomerId: string;

    it('A.1 REGISTER - should register BUSINESS_OWNER', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers/register')
        .send(businessOwner)
        .expect(201);
      boCustomerId = res.body.uuid;
      createdCustomerUuids.push(boCustomerId);
    });
    it('A.2 LOGIN - BUSINESS_OWNER', async () => {
      await customersService.update(boCustomerId, { status: CUSTOMER_STATUS.ACTIVED });
      const res = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: businessOwner.email, password: businessOwner.password })
        .expect(200);
      boToken = res.body.accessToken;
    });
    it('A.3 CREATE SALON - BUSINESS_OWNER', async () => {
      const salonData = {
        name: 'BO Salon',
        address: 'BO Address',
        phone: '+84123456780',
        email: generateUniqueEmail(),
        description: 'BO Salon Desc'
      };
      const res = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${boToken}`)
        .send(salonData)
        .expect(201);
      salonId = res.body.uuid;
    });
    it('A.4 CREATE OWNER - BUSINESS_OWNER creates OWNER', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${boToken}`)
        .send({ ...owner, salonUuid: salonId, customerRoleName: 'OWNER' })
        .expect(201);
      ownerCustomerId = res.body.uuid;
      createdCustomerUuids.push(ownerCustomerId);
    });
    it('A.5 LOGIN - OWNER', async () => {
      await customersService.update(ownerCustomerId, { status: CUSTOMER_STATUS.ACTIVED });
      const res = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: owner.email, password: owner.password })
        .expect(200);
      ownerToken = res.body.accessToken;
    });
    it('A.6 CREATE MANAGER - OWNER creates MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...manager, salonUuid: salonId, customerRoleName: 'MANAGER' })
        .expect(201);
      managerCustomerId = res.body.uuid;
      createdCustomerUuids.push(managerCustomerId);
    });
    it('A.7 LOGIN - MANAGER', async () => {
      await customersService.update(managerCustomerId, { status: CUSTOMER_STATUS.ACTIVED });
      const res = await request(app.getHttpServer())
        .post('/customers/login')
        .send({ email: manager.email, password: manager.password })
        .expect(200);
      managerToken = res.body.accessToken;
    });
    it('A.8 CRUD - BUSINESS_OWNER can CRUD customers', async () => {
      // Create
      const newCustomer = {
        email: generateUniqueEmail(),
        password: 'Test123!',
        name: 'BO CRUD',
        phone: '+84999999995',
        salonUuid: salonId,
        customerRoleName: 'STAFF'
      };
      const createRes = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${boToken}`)
        .send(newCustomer)
        .expect(201);
      const customerId = createRes.body.uuid;
      // Read
      await request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${boToken}`)
        .expect(200);
      // Update
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${boToken}`)
        .send({ name: 'BO Updated' })
        .expect(200);
      // Delete
      await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${boToken}`)
        .expect(200);
    });
    it('A.9 CRUD - OWNER can CRUD customers', async () => {
      // Create
      const newCustomer = {
        email: generateUniqueEmail(),
        password: 'Test123!',
        name: 'Owner CRUD',
        phone: '+84999999994',
        salonUuid: salonId,
        customerRoleName: 'STAFF'
      };
      const createRes = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(newCustomer)
        .expect(201);
      const customerId = createRes.body.uuid;
      // Read
      await request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      // Update
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Owner Updated' })
        .expect(200);
      // Delete
      await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
    it('A.9.1 SET ROLE - OWNER sets role for unassigned customer', async () => {
      // Create a customer without a role or salon
      const unassignedCustomer = {
        email: generateUniqueEmail(),
        password: 'Unassigned123!',
        name: 'Unassigned',
        phone: '+84999999991'
      };
      const createRes = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(unassignedCustomer)
        .expect(201);
      unassignedCustomerId = createRes.body.uuid;
      // Assign role and salon to the unassigned customer
      const assignRes = await request(app.getHttpServer())
        .patch(`/customers/${unassignedCustomerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ salonUuid: salonId, customerRoleName: 'STAFF' })
        .expect(200);
      expect(assignRes.body.uuid).toBe(unassignedCustomerId);
      // Clean up: delete the unassigned customer
      await request(app.getHttpServer())
        .delete(`/customers/${unassignedCustomerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });
  
});
