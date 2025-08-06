import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Customer } from './entities/customer.entity';
import { CustomerSalon } from './entities/customer-salon.entity';
import { CustomersController } from './customers.controller';
import { CustomerSalonsController } from './customer-salons.controller';
import { CustomersService } from './customers.service';
import { CustomerSalonsService } from './customer-salons.service';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { OwnerGuard } from './guards/owner.guard';
import { ManagerOrOwnerGuard } from './guards/manager-or-owner.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerSalon]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CustomersController, CustomerSalonsController],
  providers: [CustomersService, CustomerSalonsService, CustomerJwtStrategy, RolesGuard, OwnerGuard, ManagerOrOwnerGuard],
  exports: [CustomersService, CustomerSalonsService],
})
export class CustomersModule {}
