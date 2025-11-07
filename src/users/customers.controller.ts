import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import { User } from './entities/user.entity';
import { Customer } from 'src/customers/entities/customer.entity';

@ApiTags('user/customers')
@Controller('user/customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly permissionHelper: PermissionHelper,
  ) {}

  @Post(':salonUuid')
  @RequireAnyPermission('customers:create')
  @ApiOperation({ summary: 'Create a new customer and optionally assign to a salon with specified role' })
  @ApiResponse({ status: 201, description: 'Customer created successfully and assigned to salon with role if salonUuid provided' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only assign customers to salons you own' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async create(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Body() createCustomerDto: CreateUserCustomerDto,
    @CurrentUser() currentUser: User
  ) {
    return await this.customersService.create({
      ...createCustomerDto,
      isOwner: createCustomerDto.roleName === CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
      salonUuid,
      createdByUserUuid: currentUser.uuid
    });
  }

  @Get(':salonUuid')
  @RequireAnyPermission('customers:read', 'customers:read-all')
  @ApiOperation({ summary: 'Get customers based on role with pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owners and managers can access customer lists' })
  async findAll(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: User
  ) {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:read-all',
    );
    if (hasReadAllPermission) {
      return await this.customersService.findAllPaginated(paginationDto, salonUuid);
    }
    return await this.customersService.findAllPaginated(paginationDto, salonUuid, null, currentUser.uuid);
  }

  @Get(':salonUuid/:uuid')
  @RequireAnyPermission('customers:read', 'customers:read-all')
  @ApiOperation({ summary: 'Get customer by UUID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @CurrentUser() currentUser: User
  ) {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:read-all',
    );
    let foundCustomer: Customer;
    if (hasReadAllPermission) {
      foundCustomer = await this.customersService.findOne(salonUuid, uuid);
    } else {
      foundCustomer = await this.customersService.findOne(salonUuid, uuid, currentUser.uuid);
    }
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${uuid}" not found in salon "${salonUuid}"`);
    }
    return foundCustomer;
  }
  
  @Patch(':salonUuid/:uuid')
  @RequireAnyPermission('customers:update', 'customers:update-all')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this phone number already exists' })
  async update(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @Body() updateCustomerDto: UpdateUserCustomerDto,
    @CurrentUser() currentUser: User
  ) {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:update-all',
    );
    let foundCustomer: Customer;
    if (hasUpdateAllPermission) {
      foundCustomer = await this.customersService.findOne(salonUuid, uuid);
    } else {
      foundCustomer = await this.customersService.findOne(salonUuid, uuid, currentUser.uuid);
    }
    
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${uuid}" not found in salon "${salonUuid}"`);
    }
    
    if (hasUpdateAllPermission) {
      return await this.customersService.update(salonUuid, uuid, updateCustomerDto);
    }
    return await this.customersService.update(salonUuid, uuid, updateCustomerDto, currentUser.uuid);
  }
  
  @Delete(':salonUuid/:uuid')
  @RequireAnyPermission('customers:delete', 'customers:delete-all')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  async remove(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @CurrentUser() currentUser: User
  ) {
    const hasDeleteAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:delete-all',
    );
    let foundCustomer: Customer;
    if (hasDeleteAllPermission) {
      foundCustomer = await this.customersService.findOne(salonUuid, uuid);
    } else {
      foundCustomer = await this.customersService.findOne(salonUuid, uuid, currentUser.uuid);
    }
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${uuid}" not found in salon "${salonUuid}"`);
    }
    return await this.customersService.remove(salonUuid, uuid);
  }
}
