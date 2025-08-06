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
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from 'src/customers/customers.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateUserCustomerDto, UpdateUserCustomerDto } from './dto/customer.dto';
import { CUSTOMER_SALON_ROLE } from 'src/customers/entities/customer-salon.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/roles/guards/permissions.guard';
import { RequireAnyPermission } from 'src/roles/decorators/permissions.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PermissionHelper } from 'src/roles/helpers/permission.helper';

@ApiTags('user/customers')
@Controller('user/customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly permissionHelper: PermissionHelper,
  ) {}

  @Post()
  @RequireAnyPermission('customers:create')
  @ApiOperation({ summary: 'Create a new customer and optionally assign to a salon with specified role' })
  @ApiResponse({ status: 201, description: 'Customer created successfully and assigned to salon with role if salonUuid provided' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only assign customers to salons you own' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async create(@Body() createCustomerDto: CreateUserCustomerDto, @CurrentUser() currentUser: any) {
    return await this.customersService.create({
      ...createCustomerDto,
      isOwner: createCustomerDto.customerRoleName === CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
      createdByUserUuid: currentUser.uuid
    });
  }

  @Get()
  @RequireAnyPermission('customers:read', 'customers:read-all')
  @ApiOperation({ summary: 'Get customers based on role with pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owners and managers can access customer lists' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: any,
  ) {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'customers:read-all',
    );
    if (hasReadAllPermission) {
      return await this.customersService.findAllPaginated(paginationDto);
    }
    return await this.customersService.findAllPaginated(paginationDto, null, currentUser);
  }

  @Get(':uuid')
  @RequireAnyPermission('customers:read', 'customers:read-all')
  @ApiOperation({ summary: 'Get customer by UUID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('uuid') uuid: string, @CurrentUser() currentUser: any) {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'customers:read-all',
    );
    if (hasReadAllPermission) {
      return await this.customersService.findOne(uuid, true);
    }
    return await this.customersService.findOne(uuid, true, currentUser);
  }
  
  @Patch(':uuid')
  @RequireAnyPermission('customers:update', 'customers:update-all')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this phone number already exists' })
  async update(@Param('uuid') uuid: string, @Body() updateCustomerDto: UpdateUserCustomerDto, @CurrentUser() currentUser: any) {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'customers:update-all',
    );
    if (hasUpdateAllPermission) {
      return await this.customersService.update(uuid, updateCustomerDto);
    }
    return await this.customersService.update(uuid, updateCustomerDto, currentUser);
  }
  
  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async remove(@Param('uuid') uuid: string, @CurrentUser() currentUser: any) {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'customers:update-all',
    );
    if (hasUpdateAllPermission) {
      return await this.customersService.remove(uuid);
    }
    return await this.customersService.remove(uuid, currentUser);
  }
}
