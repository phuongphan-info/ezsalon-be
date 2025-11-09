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
import { CustomerResponse } from 'src/customers/dto/customer.response';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from 'src/common/dto/pagination.response';

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
  @ApiResponse({ status: 201, description: 'Customer created successfully and assigned to salon with role if salonUuid provided', type: CustomerResponse })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only assign customers to salons you own' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async create(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Body() createCustomerDto: CreateUserCustomerDto,
    @CurrentUser() currentUser: User
  ): Promise<CustomerResponse> {
      return plainToInstance(
        CustomerResponse,
        await this.customersService.create({
          ...createCustomerDto,
          isOwner: createCustomerDto.roleName === CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
          salonUuid,
          createdByUserUuid: currentUser.uuid
        }),
        { excludeExtraneousValues: true }
      );
  }

  @Get(':salonUuid')
  @RequireAnyPermission('customers:read', 'customers:read-all')
  @ApiOperation({ summary: 'Get customers based on role with pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully with pagination', type: PaginatedResponse<CustomerResponse> })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owners and managers can access customer lists' })
  async findAll(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: User
  ): Promise<PaginatedResponse<CustomerResponse>> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:read-all',
    );
    const { entities, total, page, limit } = await this.customersService.findAllPaginated({
      ...paginationDto,
      salonUuid,
      userUuid: !hasReadAllPermission ? currentUser.uuid : null
    });
    return new PaginatedResponse(
      entities.map((row) => plainToInstance(CustomerResponse, row, { excludeExtraneousValues: true })),
      total, page, limit
    );
  }

  @Get(':salonUuid/:uuid')
  @RequireAnyPermission('customers:read', 'customers:read-all')
  @ApiOperation({ summary: 'Get customer by UUID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully', type: CustomerResponse })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @CurrentUser() currentUser: User
  ): Promise<CustomerResponse> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:read-all',
    );
    const foundCustomer: Customer = await this.customersService.findOne(
      salonUuid, uuid, !hasReadAllPermission ? currentUser.uuid : null
    );
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${uuid}" not found in salon "${salonUuid}"`);
    }
    return plainToInstance(CustomerResponse, foundCustomer, { excludeExtraneousValues: true });
  }
  
  @Patch(':salonUuid/:uuid')
  @RequireAnyPermission('customers:update', 'customers:update-all')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully', type: CustomerResponse })
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
  ): Promise<CustomerResponse> {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.uuid,
      'customers:update-all',
    );
    const foundCustomer: Customer = await this.customersService.findOne(
      salonUuid, uuid, !hasUpdateAllPermission ? currentUser.uuid : null
    );
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${uuid}" not found in salon "${salonUuid}"`);
    }
    return await this.customersService.update(
      salonUuid, uuid, updateCustomerDto, !hasUpdateAllPermission ? currentUser.uuid : null
    );
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
    const foundCustomer: Customer = await this.customersService.findOne(
      salonUuid, uuid, !hasDeleteAllPermission ? currentUser.uuid : null
    );
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${uuid}" not found in salon "${salonUuid}"`);
    }
    return await this.customersService.remove(salonUuid, uuid);
  }
}
