import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppDataSource } from '../src/database/data-source';
import { seedPermissionsAndRoles } from '../src/database/seed-permissions';
import { seedUsersOnly } from '../src/database/seed-users';

const prepareE2EDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.runMigrations();
  await seedPermissionsAndRoles(false, false);
  await seedUsersOnly(false, false);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
};

declare global {
  var testApp: INestApplication;
  var moduleRef: TestingModule;
}

beforeAll(async () => {
  await prepareE2EDatabase();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  
  // Apply global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  await app.init();
  
  global.testApp = app;
  global.moduleRef = moduleFixture;
});

afterAll(async () => {
  if (global.testApp) {
    await global.testApp.close();
  }
  if (global.moduleRef) {
    await global.moduleRef.close();
  }
});

// Set longer timeout for all tests
jest.setTimeout(30000);
