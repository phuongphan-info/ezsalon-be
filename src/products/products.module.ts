import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { CacheService } from '../common/services/cache.service';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), RolesModule],
  controllers: [ProductsController],
  providers: [ProductsService, CacheService],
  exports: [ProductsService],
})
export class ProductsModule {}