import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequireAnyPermission } from '../roles/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionHelper } from '../roles/helpers/permission.helper';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionHelper: PermissionHelper,
  ) {}

  @Post()
  @RequireAnyPermission('users:create')
  @ApiOperation({ summary: 'Create a new user (requires users:create permission)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:create permission required' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: any) {
    return this.usersService.create(createUserDto, currentUser.userId);
  }

  @Get()
  @RequireAnyPermission('users:read', 'users:read-all')
  @ApiOperation({ summary: 'Get users based on permissions (users:read or users:read-all)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:read or users:read-all permission required' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: any,
  ) {
    // Check if user has permission to read all users
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:read-all',
    );

    if (hasReadAllPermission) {
      // Return paginated users
      return this.usersService.findAllPaginated(paginationDto);
    }
    // Return only users created by the current user (paginated)
    return this.usersService.findByCreator(currentUser.userId, paginationDto);
  }

  @Get(':uuid')
  @RequireAnyPermission('users:read', 'users:read-all')
  @ApiOperation({ summary: 'Get user by UUID (based on ownership and permissions)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:read or users:read-all permission required' })
  @ApiResponse({ status: 404, description: 'User not found or access denied' })
  async findOne(@Param('uuid') uuid: string, @CurrentUser() currentUser: any) {
    // Check if user has permission to read all users
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:read-all',
    );

    return this.usersService.findOneByOwnership(uuid, currentUser.userId, hasReadAllPermission);
  }

  @Patch(':uuid')
  @RequireAnyPermission('users:update')
  @ApiOperation({ summary: 'Update user (requires users:update permission, restricted by ownership)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:update permission required' })
  @ApiResponse({ status: 404, description: 'User not found or access denied' })
  async update(@Param('uuid') uuid: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() currentUser: any) {
    // For update, we'll be more restrictive - only allow updating users they created
    // Unless they have a special "update-all" permission (you can add this if needed)
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:update-all',
    );

    return this.usersService.updateByOwnership(uuid, updateUserDto, currentUser.userId, hasUpdateAllPermission);
  }

  @Delete(':uuid')
  @RequireAnyPermission('users:delete')
  @ApiOperation({ summary: 'Delete user (requires users:delete permission, restricted by ownership)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:delete permission required or protected admin account' })
  @ApiResponse({ status: 404, description: 'User not found or access denied' })
  @ApiResponse({ status: 409, description: 'Conflict - Cannot delete your own account or protected admin' })
  async remove(@Param('uuid') uuid: string, @CurrentUser() currentUser: any) {
    // For delete, we'll also be restrictive - only allow deleting users they created
    // Unless they have a special "delete-all" permission (you can add this if needed)
    const hasDeleteAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:delete-all',
    );

    return this.usersService.removeByOwnership(uuid, currentUser.userId, hasDeleteAllPermission);
  }
}
