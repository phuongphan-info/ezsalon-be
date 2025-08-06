import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequireAnyPermission } from '../decorators/permissions.decorator';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from '../dto/role.dto';
import { RolesService } from '../services/roles.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequireAnyPermission('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - roles:assign-permissions required when assigning permissions' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() currentUser: any) {
    return this.rolesService.create(createRoleDto, currentUser.userId);
  }

  @Get()
  @RequireAnyPermission('roles:read')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':uuid')
  @RequireAnyPermission('roles:read')
  @ApiOperation({ summary: 'Get role by UUID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('uuid') uuid: string) {
    return this.rolesService.findOne(uuid);
  }

  @Patch(':uuid')
  @RequireAnyPermission('roles:update')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - roles:assign-permissions required when assigning permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async update(
    @Param('uuid') uuid: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.rolesService.update(uuid, updateRoleDto, currentUser.userId);
  }

  @Post(':uuid/assign-permissions')
  @RequireAnyPermission('roles:assign-permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Invalid permission names' })
  async assignPermissions(
    @Param('uuid') uuid: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(uuid, assignPermissionsDto);
  }

  @Delete(':uuid')
  @RequireAnyPermission('roles:delete')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete role with assigned users' })
  async remove(@Param('uuid') uuid: string) {
    return this.rolesService.remove(uuid);
  }
}
