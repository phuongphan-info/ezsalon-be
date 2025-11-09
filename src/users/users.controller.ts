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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UserResponse } from './dto/user.response';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from 'src/common/dto/pagination.response';

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
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponse })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:create permission required' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: any): Promise<UserResponse> {
    return plainToInstance(
      UserResponse,
      await this.usersService.create(createUserDto, currentUser.userId),
      { excludeExtraneousValues: true }
    );
  }

  @Get()
  @RequireAnyPermission('users:read', 'users:read-all')
  @ApiOperation({ summary: 'Get users based on permissions (users:read or users:read-all)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully with pagination', type: PaginatedResponse<UserResponse> })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:read or users:read-all permission required' })
  async findAll(
    @Query() query: UserQueryDto,
    @CurrentUser() currentUser: any,
  ): Promise<PaginatedResponse<UserResponse>> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:read-all',
    );
    if (!hasReadAllPermission) {
      query.createdByUuid = currentUser.userId;
    }
    const { entities, total, page, limit } = await this.usersService.findAllPaginated(query);
    return new PaginatedResponse(
      entities.map((row) => plainToInstance(UserResponse, row, { excludeExtraneousValues: true })),
      total, page, limit
    );
  }

  @Get(':uuid')
  @RequireAnyPermission('users:read', 'users:read-all')
  @ApiOperation({ summary: 'Get user by UUID (based on ownership and permissions)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:read or users:read-all permission required' })
  @ApiResponse({ status: 404, description: 'User not found or access denied' })
  async findOne(@Param('uuid') uuid: string, @CurrentUser() currentUser: any): Promise<UserResponse> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:read-all',
    );
    return plainToInstance(
      UserResponse,
      await this.usersService.findOneByOwnership(uuid, currentUser.userId, hasReadAllPermission),
      { excludeExtraneousValues: true }
    );
  }

  @Patch(':uuid')
  @RequireAnyPermission('users:update')
  @ApiOperation({ summary: 'Update user (requires users:update permission, restricted by ownership)' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponse })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - users:update permission required' })
  @ApiResponse({ status: 404, description: 'User not found or access denied' })
  async update(@Param('uuid') uuid: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() currentUser: any): Promise<UserResponse> {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:update-all',
    );
    return plainToInstance(
      UserResponse,
      await this.usersService.updateByOwnership(uuid, updateUserDto, currentUser.userId, hasUpdateAllPermission),
      { excludeExtraneousValues: true }
    );
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
    const hasDeleteAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'users:delete-all',
    );
    return this.usersService.removeByOwnership(uuid, currentUser.userId, hasDeleteAllPermission);
  }
}
