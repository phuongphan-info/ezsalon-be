import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/common/services/cache.service';

describe('Auth Role E2E', () => {
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

  describe('Auth Role E2E Flow', () => {
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
  });
});
