import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { RolesModule } from '../roles/roles.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CustomersModule } from 'src/customers/customers.module';
import { CustomersController } from './customers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role]), RolesModule, CustomersModule],
  controllers: [UsersController, CustomersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
