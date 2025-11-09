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
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions, RequireAnyPermission } from '../roles/decorators/permissions.decorator';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PlansService } from './plans.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PLAN_STATUS, PLAN_TYPE } from './entities/plan.entity';
import { PermissionHelper } from '../roles/helpers/permission.helper';
import { PaginatedResponse } from 'src/common/dto/pagination.response';
import { PlanResponse, PlanStatisticsResponse, PublicPlanResponse } from './dto/plan.response';
import { plainToInstance } from 'class-transformer';

@ApiTags('plans')
@Controller('plans')
@UseInterceptors(ClassSerializerInterceptor)
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly permissionHelper: PermissionHelper,
  ) {}

  @Get('public')
  @ApiOperation({ summary: 'Get all active plans (public access)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Active plans retrieved successfully',
    type: [PublicPlanResponse]
  })
  async findActivePublic(): Promise<PublicPlanResponse[]> {
    return this.plansService.findActivePublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('plans:create')
  @SerializeOptions({ type: PlanResponse })
  @ApiOperation({ summary: 'Create a new plan plan' })
  @ApiResponse({ 
    status: 201, 
    description: 'Plan created successfully',
    type: PlanResponse
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - plans:create permission required' })
  @ApiResponse({ status: 409, description: 'Conflict - Plan with this name or Stripe ID already exists' })
  async create(
    @Body() createPlanDto: CreatePlanDto,
    @CurrentUser() currentUser: any,
  ): Promise<PlanResponse> {
    return this.plansService.create(createPlanDto, currentUser.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('plans:read', 'plans:read-all')
  @SerializeOptions({ type: PaginatedResponse<PlanResponse> })
  @ApiOperation({ summary: 'Get plans with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by plan name' })
  @ApiQuery({ name: 'status', required: false, enum: PLAN_STATUS, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: PLAN_TYPE, description: 'Filter by type' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plans retrieved successfully. Returns user\'s plans with plans:read permission, or all plans with plans:read-all permission',
    type: PaginatedResponse<PlanResponse>
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - plans:read or plans:read-all permission required' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ): Promise<PaginatedResponse<PlanResponse>> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'plans:read-all',
    );
    const { entities, total, page, limit } = await this.plansService.findAllPaginated(
      paginationDto, search, status, type, !hasReadAllPermission ? currentUser.userId : null
    );
    return new PaginatedResponse(
      entities.map((row) => plainToInstance(PlanResponse, row, { excludeExtraneousValues: true })),
      total, page, limit
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('plans:read-all')
  @ApiOperation({ summary: 'Get plan statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plan statistics retrieved successfully',
    type: PlanStatisticsResponse
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - plans:read-all permission required' })
  async getStats(): Promise<PlanStatisticsResponse> {
    return this.plansService.getPlanStats();
  }

  @Get(':uuid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @SerializeOptions({ type: PlanResponse })
  @RequireAnyPermission('plans:read', 'plans:read-all')
  @ApiOperation({ summary: 'Get a plan by UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plan retrieved successfully',
    type: PlanResponse
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - plans:read or plans:read-all permission required' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findOne(@Param('uuid') uuid: string, @CurrentUser() currentUser: any): Promise<PlanResponse> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'plans:read-all',
    );
    if (hasReadAllPermission) {
      return await this.plansService.findOne(uuid);
    }
    const plan = await this.plansService.findOne(uuid);
    if (plan.createdByUuid !== currentUser.userId) {
      throw new ForbiddenException('You can only access plans you created');
    }
    return plan;
  }

  @Patch(':uuid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('plans:update', 'plans:update-all')
  @ApiOperation({ summary: 'Update a plan' })  
  @ApiResponse({ 
    status: 200, 
    description: 'Plan updated successfully',
    type: PlanResponse
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - plans:update or plans:update-all permission required' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Plan with this name or Stripe ID already exists' })
  async update(@Param('uuid') uuid: string, @Body() updatePlanDto: UpdatePlanDto, @CurrentUser() currentUser: any): Promise<PlanResponse> {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'plans:update-all',
    );
    if (hasUpdateAllPermission) {
      return await this.plansService.update(uuid, updatePlanDto);
    }
    const plan = await this.plansService.findOne(uuid);
    if (plan.createdByUuid !== currentUser.userId) {
      throw new ForbiddenException('You can only update plans you created');
    }
    return await this.plansService.update(uuid, updatePlanDto);
  }

  @Delete(':uuid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('plans:delete', 'plans:delete-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plan' })
  @ApiResponse({ status: 204, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - plans:delete or plans:delete-all permission required' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async remove(@Param('uuid') uuid: string, @CurrentUser() currentUser: any): Promise<void> {
    const hasDeleteAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'plans:delete-all',
    );
    if (hasDeleteAllPermission) {
      return await this.plansService.remove(uuid);
    }
    const plan = await this.plansService.findOne(uuid);
    if (plan.createdByUuid !== currentUser.userId) {
      throw new ForbiddenException('You can only delete plans you created');
    }
    return await this.plansService.remove(uuid);
  }
}
