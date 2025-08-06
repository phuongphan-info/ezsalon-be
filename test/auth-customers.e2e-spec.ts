import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';

describe('Auth Customer E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let accessToken: string;
  
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

  describe('Auth Customer E2E Flow', () => {
    it('1. LOGIN - should login with admin user', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password
        })
        .expect(201);

      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(adminUser.email);

      accessToken = body.accessToken;
    });

    let createdCustomerUuid: string;
    it('2. CREATE - should create a new customer', async () => {
      const newCustomer = {
        name: 'Test Customer',
        email: `test-customer-${uuid()}@ezsalon.com`,
        phone: '0123456789',
        password: 'customer123'
      };

      const { body } = await request(app.getHttpServer())
        .post('/user/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newCustomer)
        .expect(201);

      expect(body).toHaveProperty('uuid');
      expect(body.name).toBe(newCustomer.name);
      expect(body.email).toBe(newCustomer.email);
      expect(body.phone).toBe(newCustomer.phone);
      createdCustomerUuid = body.uuid;
    });

    it('3. GET - should get the created customer by uuid', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/user/customers/${createdCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(body).toHaveProperty('uuid', createdCustomerUuid);
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('phone');
    });

    it('4. DELETE - should delete the created customer by uuid', async () => {
      await request(app.getHttpServer())
        .delete(`/user/customers/${createdCustomerUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  let moderatorA = {
    email: `moderator-a-${uuid()}@ezsalon.com`,
    password: 'moderator123',
    name: 'Moderator A',
    role: 'MODERATOR'
  };
  let moderatorB = {
    email: `moderator-b-${uuid()}@ezsalon.com`,
    password: 'moderator123',
    name: 'Moderator B',
    role: 'MODERATOR'
  };
  let moderatorAUuid: string;
  let moderatorBUuid: string;
  let moderatorAToken: string;
  let moderatorBToken: string;
  let customerAUuid: string;
  let customerBUuid: string;

  describe('Moderator isolation and admin access', () => {
    it('A.1 CREATE - should create moderator A', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(moderatorA)
        .expect(201);
      moderatorAUuid = body.uuid;
    });
    it('A.2 CREATE - should create moderator B', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(moderatorB)
        .expect(201);
      moderatorBUuid = body.uuid;
    });
    it('A.3 LOGIN - should login moderator A', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: moderatorA.email, password: moderatorA.password })
        .expect(201);
      moderatorAToken = body.accessToken;
    });
    it('A.4 LOGIN - should login moderator B', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: moderatorB.email, password: moderatorB.password })
        .expect(201);
      moderatorBToken = body.accessToken;
    });
    it('A.5 CREATE - moderator A creates a customer', async () => {
      const newCustomer = {
        name: 'Customer A',
        email: `customer-a-${uuid()}@ezsalon.com`,
        phone: '0123456789',
        password: 'customer123'
      };
      const { body } = await request(app.getHttpServer())
        .post('/user/customers')
        .set('Authorization', `Bearer ${moderatorAToken}`)
        .send(newCustomer)
        .expect(201);
      customerAUuid = body.uuid;
    });
    it('A.6 CREATE - moderator B creates a customer', async () => {
      const newCustomer = {
        name: 'Customer B',
        email: `customer-b-${uuid()}@ezsalon.com`,
        phone: '0987654321',
        password: 'customer123'
      };
      const { body } = await request(app.getHttpServer())
        .post('/user/customers')
        .set('Authorization', `Bearer ${moderatorBToken}`)
        .send(newCustomer)
        .expect(201);
      customerBUuid = body.uuid;
    });
    it('A.7 FORBIDDEN - moderator A cannot get customer B', async () => {
      await request(app.getHttpServer())
        .get(`/user/customers/${customerBUuid}`)
        .set('Authorization', `Bearer ${moderatorAToken}`)
        .expect(403);
    });
    it('A.8 FORBIDDEN - moderator B cannot get customer A', async () => {
      await request(app.getHttpServer())
        .get(`/user/customers/${customerAUuid}`)
        .set('Authorization', `Bearer ${moderatorBToken}`)
        .expect(403);
    });
    it('A.9 FORBIDDEN - moderator A cannot delete customer B', async () => {
      await request(app.getHttpServer())
        .delete(`/user/customers/${customerBUuid}`)
        .set('Authorization', `Bearer ${moderatorAToken}`)
        .expect(403);
    });
    it('A.10 FORBIDDEN - moderator B cannot delete customer A', async () => {
      await request(app.getHttpServer())
        .delete(`/user/customers/${customerAUuid}`)
        .set('Authorization', `Bearer ${moderatorBToken}`)
        .expect(403);
    });
    it('A.11 FORBIDDEN - moderator A cannot update customer B', async () => {
      await request(app.getHttpServer())
        .patch(`/user/customers/${customerBUuid}`)
        .set('Authorization', `Bearer ${moderatorAToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
    it('A.12 FORBIDDEN - moderator B cannot update customer A', async () => {
      await request(app.getHttpServer())
        .patch(`/user/customers/${customerAUuid}`)
        .set('Authorization', `Bearer ${moderatorBToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
    it('A.13 ADMIN - admin can get customer A', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/user/customers/${customerAUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(body).toHaveProperty('uuid', customerAUuid);
    });
    it('A.14 ADMIN - admin can get customer B', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/user/customers/${customerBUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(body).toHaveProperty('uuid', customerBUuid);
    });
    it('A.15 ADMIN - admin can delete customer A', async () => {
      await request(app.getHttpServer())
        .delete(`/user/customers/${customerAUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
    it('A.16 ADMIN - admin can delete customer B', async () => {
      await request(app.getHttpServer())
        .delete(`/user/customers/${customerBUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
    it('A.17 ADMIN - delete moderator A', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${moderatorAUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
    it('A.18 ADMIN - delete moderator B', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${moderatorBUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Moderator can CRUD their own customers', () => {
    let modToken: string;
    let modUuid: string;
    let modCustomerUuid: string;
    const modUser = {
      email: `mod-crud-${uuid()}@ezsalon.com`,
      password: 'modcrud123',
      name: 'Mod CRUD',
      role: 'MODERATOR'
    };
    it('B.1 CREATE - should create moderator user', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(modUser)
        .expect(201);
      modUuid = body.uuid;
    });
    it('B.2 LOGIN - should login moderator', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: modUser.email, password: modUser.password })
        .expect(201);
      modToken = body.accessToken;
    });
    it('B.3 CREATE - moderator creates a customer', async () => {
      const newCustomer = {
        name: 'CRUD Customer',
        email: `crud-customer-${uuid()}@ezsalon.com`,
        phone: '0111111111',
        password: 'customer123'
      };
      const { body } = await request(app.getHttpServer())
        .post('/user/customers')
        .set('Authorization', `Bearer ${modToken}`)
        .send(newCustomer)
        .expect(201);
      modCustomerUuid = body.uuid;
    });
    it('B.4 READ - moderator gets their own customer', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/user/customers/${modCustomerUuid}`)
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);
      expect(body).toHaveProperty('uuid', modCustomerUuid);
    });
    it('B.5 UPDATE - moderator updates their own customer', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/user/customers/${modCustomerUuid}`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
      expect(body).toHaveProperty('name', 'Updated Name');
    });
    it('B.6 DELETE - moderator deletes their own customer', async () => {
      await request(app.getHttpServer())
        .delete(`/user/customers/${modCustomerUuid}`)
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);
    });
    it('B.7 ADMIN - delete moderator user', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${modUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
