import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { CreateCustomerDto, UpdateCustomerDto, CustomerLoginDto } from './dto/customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CustomersService } from './customers.service';
import { CustomerSalonsService } from './customer-salons.service';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OwnerGuard } from './guards/owner.guard';
import { ManagerOrOwnerGuard, ManagerOrOwnerOnly } from './guards/manager-or-owner.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Public } from './decorators/public.decorator';
import { CUSTOMER_STATUS } from './entities/customer.entity';

@ApiTags('customers')
@Controller('customers')
@UseGuards(CustomerJwtAuthGuard, RolesGuard, OwnerGuard, ManagerOrOwnerGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerSalonsService: CustomerSalonsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer and optionally assign to a salon with specified role' })
  @ApiResponse({ status: 201, description: 'Customer created successfully and assigned to salon with role if salonUuid provided' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only assign customers to salons you own' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async create(@Body() createCustomerDto: CreateCustomerDto, @CurrentCustomer() currentCustomer: any) {
    // If salonUuid is provided, validate that the logged-in customer owns this salon
    if (createCustomerDto.salonUuid) {
      await this.customerSalonsService.validateSalonOwnership(
        currentCustomer.customer.uuid,
        createCustomerDto.salonUuid
      );
    }

    // Track which customer created this customer
    return await this.customersService.create({
      ...createCustomerDto,
      status: CUSTOMER_STATUS.ACTIVED,
      isOwner: false, // Staff/customers created by owners are not owners themselves
      createdByUuid: currentCustomer.customer.uuid,
    });
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register new owner customer' })
  @ApiResponse({ status: 201, description: 'Owner registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async register(@Body() createCustomerDto: CreateCustomerDto) {
    // Registration creates new customer as owner by default
    return await this.customersService.create({
      ...createCustomerDto,
      status: CUSTOMER_STATUS.PENDING,
      isOwner: true, // New registered customers are owners by default
      createdByUuid: null, // Self-registration, no creator.             
    });
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer login' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { 
    properties: { 
      accessToken: { type: 'string' }, 
      customer: { 
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          roleName: { type: 'string' }
        }
      } 
    } 
  }})
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() customerLoginDto: CustomerLoginDto) {
    const customer = await this.customersService.findByEmail(customerLoginDto.email);

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if customer status is ACTIVED
    if (customer.status !== CUSTOMER_STATUS.ACTIVED) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    const isPasswordValid = await this.customersService.validatePassword(
      customerLoginDto.password,
      customer.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: customer.email, sub: customer.uuid, type: 'customer' };
    return {
      accessToken: this.jwtService.sign(payload),
      customer: {
        uuid: customer.uuid,
        email: customer.email,
        name: customer.name,
      },
    };
  }

  @Get()
  @ManagerOrOwnerOnly()
  @ApiOperation({ summary: 'Get customers based on role with pagination - Owners see managers/staff, Managers see staff only' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owners and managers can access customer lists' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentCustomer() currentCustomer: any
  ) {
    // Always use pagination - require page and limit parameters
    return await this.customersService.findAllPaginated(paginationDto, currentCustomer.customer);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentCustomer(@CurrentCustomer() currentCustomer: any) {
    return currentCustomer.customer;
  }

  @Get(':uuid')
  @ManagerOrOwnerOnly()
  @ApiOperation({ summary: 'Get customer by UUID (only customers belonging to your salons)' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  async findOne(@Param('uuid') uuid: string, @CurrentCustomer() currentCustomer: any) {
    // Validate that the requested customer belongs to the current customer's salons
    await this.customersService.validateCustomerAccess(currentCustomer.customer, uuid);
    return await this.customersService.findOne(uuid, true);
  }

  @Patch(':uuid')
  @ManagerOrOwnerOnly()
  @ApiOperation({ summary: 'Update customer (only customers belonging to your salons)' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this phone number already exists' })
  async update(@Param('uuid') uuid: string, @Body() updateCustomerDto: UpdateCustomerDto, @CurrentCustomer() currentCustomer: any) {
    // If salonUuid is provided, validate that the logged-in customer owns this salon
    if (updateCustomerDto.salonUuid) {
      await this.customerSalonsService.validateSalonOwnership(
        currentCustomer.customer.uuid,
        updateCustomerDto.salonUuid
      );
    }
    return await this.customersService.update(uuid, updateCustomerDto);
  }

  @Delete(':uuid')
  @ManagerOrOwnerOnly()
  @ApiOperation({ summary: 'Delete customer (only customers belonging to your salons)' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async remove(@Param('uuid') uuid: string, @CurrentCustomer() currentCustomer: any) {
    // Validate that the requested customer belongs to the current customer's salons
    await this.customersService.validateCustomerAccess(currentCustomer.customer, uuid);
    return await this.customersService.remove(uuid);
  }
}
