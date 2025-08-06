import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';

declare global {
  var testApp: INestApplication;
  var moduleRef: TestingModule;
}

beforeAll(async () => {
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
