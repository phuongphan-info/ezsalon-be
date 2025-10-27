import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { Plan } from './entities/plan.entity';
import { CacheService } from '../common/services/cache.service';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [TypeOrmModule.forFeature([Plan]), RolesModule],
  controllers: [PlansController],
  providers: [PlansService, CacheService],
  exports: [PlansService],
})
export class PlansModule {}