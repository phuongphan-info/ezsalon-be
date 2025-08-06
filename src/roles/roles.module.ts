import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionHelper } from './helpers/permission.helper';
import { PermissionsService } from './services/permissions.service';
import { RolesService } from './services/roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesService,
    PermissionsService,
    PermissionsGuard,
    PermissionHelper,
  ],
  exports: [
    RolesService,
    PermissionsService,
    PermissionsGuard,
    PermissionHelper,
  ],
})
export class RolesModule {}
