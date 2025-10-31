import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { RolesModule } from './roles/roles.module';
import { SalonsModule } from './salons/salons.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { PlansModule } from './plans/plans.module';
import { PaymentsModule } from './payments/payments.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './common/health.module';
import { HeadersMiddleware } from './common/middleware/headers.middleware';
import { resolveDatabaseConfig } from './database/database-env.util';

const { host: dbHost, port: dbPort, username: dbUsername, password: dbPassword, database: dbName, useTest } =
  resolveDatabaseConfig();

@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: dbHost,
      port: dbPort,
      username: dbUsername,
      password: dbPassword,
      database: dbName,
      autoLoadEntities: true,
      synchronize: false, // set to false in planion
      logging: useTest ? false : true,
    }),
    PassportModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    SalonsModule,
    CustomersModule,
    PlansModule,
    PaymentsModule,
    ChatModule,
    CommonModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HeadersMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
