import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { CreateCustomerDto, UpdateCustomerDto, CustomerLoginDto } from './dto/customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CustomersService } from './customers.service';
import { CustomerSalonsService } from './customer-salons.service';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OwnerGuard } from './guards/owner.guard';
import { ManagerOrOwnerGuard, ManagerOrOwnerOnly } from './guards/manager-or-owner.guard';
import { SalonOwnershipGuard } from './guards/salon-ownership.guard';
import { SalonManagementGuard } from './guards/salon-management.guard';
import { SalonManagementAccessCustomerGuard } from './guards/salon-management-access-customer.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Public } from './decorators/public.decorator';
import { SalonOwnership } from './decorators/salon-ownership.decorator';
import { SalonManagement } from './decorators/salon-management.decorator';
import { SalonManagementAccessCustomer } from './decorators/salon-management-access-customer.decorator';
import { Customer, CUSTOMER_STATUS } from './entities/customer.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CUSTOMER_SALON_ROLE } from './entities/customer-salon.entity';

@ApiTags('customers')
@Controller('customers')
@UseGuards(
  CustomerJwtAuthGuard,
  RolesGuard,
  OwnerGuard,
  ManagerOrOwnerGuard,
  SalonOwnershipGuard,
  SalonManagementGuard,
  SalonManagementAccessCustomerGuard,
)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerSalonsService: CustomerSalonsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register new owner customer' })
  @ApiResponse({ status: 201, description: 'Owner registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async register(@Body() createCustomerDto: CreateCustomerDto) {
    // Registration creates new customer as owner by default
    const customer = await this.customersService.create({
      ...createCustomerDto,
      status: CUSTOMER_STATUS.ACTIVED,
      isOwner: true, // New registered customers are owners by default
      createdByUuid: null, // Self-registration, no creator.             
    });

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

  // Social OAuth Routes
  @Public()
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @Get('login/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('login/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@CurrentUser() currentUser: any) {
    return this.buildSocialLoginResponse(currentUser);
  }

  @Public()
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @Get('login/facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {}

  @Public()
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('login/facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@CurrentUser() currentUser: any) {
    return this.buildSocialLoginResponse(currentUser);
  }

  @Public()
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  @Get('login/apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth() {}

  @Public()
  @ApiOperation({ summary: 'Apple OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('login/apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthRedirect(@CurrentUser() currentUser: any) {
    return this.buildSocialLoginResponse(currentUser);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentCustomer(@CurrentCustomer() currentCustomer: any) {
    return currentCustomer.customer;
  }

  @Post(':salonUuid')
  @SalonOwnership()
  @ApiOperation({ summary: 'Create a new customer and optionally assign to a salon with specified role' })
  @ApiResponse({ status: 201, description: 'Customer created successfully and assigned to salon with role if salonUuid provided' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only assign customers to salons you own' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this email or phone number already exists' })
  async create(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentCustomer() { customer }: { customer: Customer }
  ) {
    await this.customerSalonsService.validateSalonManagementCreateCustomerWithRole(
      customer.uuid,
      salonUuid,
      createCustomerDto.roleName
    );
    return await this.customersService.create({
      ...createCustomerDto,
      isOwner: false,
      salonUuid,
      createdByUuid: customer.uuid,
    });
  }

  @Get(':salonUuid')
  @ManagerOrOwnerOnly()
  @ApiOperation({ summary: 'Get customers based on role with pagination - Owners see managers/staff, Managers see staff only' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owners and managers can access customer lists' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid salon UUID format' })
  async findAll(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Query() paginationDto: PaginationDto,
    @CurrentCustomer() { customer }: { customer: Customer }
  ) {
    let roles: string[];
    if (await this.customerSalonsService.isBusinessOwner(customer.uuid, salonUuid)) {
      roles = [CUSTOMER_SALON_ROLE.OWNER, CUSTOMER_SALON_ROLE.MANAGER, CUSTOMER_SALON_ROLE.FRONT_DESK, CUSTOMER_SALON_ROLE.STAFF];
    } else if (await this.customerSalonsService.isOwnerManager(customer.uuid, salonUuid)) {
      roles = [CUSTOMER_SALON_ROLE.MANAGER, CUSTOMER_SALON_ROLE.FRONT_DESK, CUSTOMER_SALON_ROLE.STAFF];
    } else if (await this.customerSalonsService.isManager(customer.uuid, salonUuid)) {
      roles = [CUSTOMER_SALON_ROLE.FRONT_DESK, CUSTOMER_SALON_ROLE.STAFF];
    } else {
      throw new ForbiddenException('Unauthorized to access customers of this salon');
    }
    return await this.customersService.findAllPaginated(paginationDto, salonUuid, null, null, roles);
  }

  @Get(':salonUuid/:uuid')
  @ManagerOrOwnerOnly()
  @SalonManagement()
  @SalonManagementAccessCustomer()
  @ApiOperation({ summary: 'Get customer by UUID (only customers belonging to your salons)' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  async findOne(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @CurrentCustomer() { customer }: { customer: Customer }
  ) {
    // Guard already validated and fetched the customer
    const foundCustomer = await this.customersService.findOne(salonUuid, uuid);
    return foundCustomer;
  }

  @Patch(':salonUuid/:uuid')
  @ManagerOrOwnerOnly()
  @SalonManagement()
  @SalonManagementAccessCustomer()
  @ApiOperation({ summary: 'Update customer (only customers belonging to your salons)' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or phone number format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  @ApiResponse({ status: 409, description: 'Conflict - Customer with this phone number already exists' })
  async update(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentCustomer() { customer }: { customer: Customer }
  ) {
    if (updateCustomerDto.roleName) {
      await this.customerSalonsService.validateSalonManagementCreateCustomerWithRole(
        customer.uuid,
        salonUuid,
        updateCustomerDto.roleName
      );
    }
    // Guard already validated and fetched the customer
    return await this.customersService.update(salonUuid, uuid, updateCustomerDto);
  }

  @Delete(':salonUuid/:uuid')
  @ManagerOrOwnerOnly()
  @SalonManagement()
  @SalonManagementAccessCustomer()
  @ApiOperation({ summary: 'Delete customer (only customers belonging to your salons)' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer does not belong to your salons' })
  @ApiResponse({ status: 404, description: 'Customer not found in this salon' })
  async remove(
    @Param('salonUuid', new ParseUUIDPipe({ version: '4' })) salonUuid: string,
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @CurrentCustomer() { customer }: { customer: Customer }
  ) {
    // Guard already validated and fetched the customer
    return await this.customersService.remove(salonUuid, uuid);
  }

  private buildSocialLoginResponse(authResult: any) {
    if (!authResult || !authResult.user) {
      throw new UnauthorizedException('Social authentication failed');
    }

    const { user: customer, socialAccount, isNewUser } = authResult;

    const payload = { email: customer.email, sub: customer.uuid, type: 'customer' };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      customer: {
        uuid: customer.uuid,
        email: customer.email,
        name: customer.name,
        avatar: customer.avatar,
        role: customer.role,
        isNewUser,
      },
      socialAccount: socialAccount
        ? {
            uuid: socialAccount.uuid,
            socialName: socialAccount.socialName,
            displayName: socialAccount.displayName,
            avatarUrl: socialAccount.avatarUrl,
          }
        : null,
    };
  }
}
