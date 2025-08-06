import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { CustomerSalonsService } from '../customers/customer-salons.service';
import { Salon } from './entities/salon.entity';
import { User } from '../users/entities/user.entity';
import { CustomerSalon } from '../customers/entities/customer-salon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Salon, User, CustomerSalon])],
  controllers: [SalonsController],
  providers: [SalonsService, CustomerSalonsService],
  exports: [SalonsService],
})
export class SalonsModule {}
