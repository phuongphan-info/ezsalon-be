import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequireAnyPermission } from '../decorators/permissions.decorator';
import { PermissionsService } from '../services/permissions.service';

@ApiTags('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequireAnyPermission('permissions:read')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findAll() {
    return this.permissionsService.findAll();
  }
}
