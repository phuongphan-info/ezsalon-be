import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customers/guards/customer-jwt-auth.guard';
import { OwnerGuard } from '../customers/guards/owner.guard';
import { CurrentCustomer } from '../customers/decorators/current-customer.decorator';
import { OwnerOnly } from '../customers/decorators/owner-only.decorator';
import { CustomerSalonsService } from '../customers/customer-salons.service';
import { CUSTOMER_SALON_ROLE } from '../customers/entities/customer-salon.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SalonsService } from './salons.service';
import { CreateSalonDto, UpdateSalonDto } from './dto/salon.dto';
import { Salon, SALON_STATUS } from './entities/salon.entity';

@ApiTags('salons')
@ApiBearerAuth('JWT-auth')
@UseGuards(CustomerJwtAuthGuard, OwnerGuard)
@Controller('salons')
export class SalonsController {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly customerSalonsService: CustomerSalonsService,
  ) {}

  @Post()
  @OwnerOnly()
  @ApiOperation({ summary: 'Create a new salon and assign customer as owner (Owner only)' })
  @ApiResponse({
    status: 201,
    description: 'Salon created successfully and customer assigned as owner',
    type: Salon,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owners can create salons' })
  @ApiResponse({ status: 409, description: 'Customer-salon relationship already exists' })
  async create(@Body() createSalonDto: CreateSalonDto, @CurrentCustomer() currentCustomer: any): Promise<Salon> {
    // Create the salon
    const salon = await this.salonsService.create(createSalonDto);
    
    try {
      // Automatically create customer-salon relationship with BUSINESS_OWNER role
      await this.customerSalonsService.create({
        customerUuid: currentCustomer.customer.uuid,
        salonUuid: salon.uuid,
        roleName: CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
      });
    } catch (error) {
      // If relationship creation fails, we should clean up the salon
      // This is unlikely to happen but good for consistency
      await this.salonsService.remove(salon.uuid);
      throw error;
    }
    
    return salon;
  }

  @Get()
  @ApiOperation({ summary: 'Get salons belonging to logged in customer with pagination' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter salons by status',
    enum: SALON_STATUS,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search salons by name, address, or email',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of customer salons',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT token' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentCustomer() currentCustomer: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    // Get paginated salons belonging to the logged-in customer with filters applied at DB level
    return await this.salonsService.findAllPaginated(
      paginationDto, 
      currentCustomer.customer.uuid,
      status,
      search
    );
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get salon by ID (if customer has access)' })
  @ApiResponse({
    status: 200,
    description: 'Salon found',
    type: Salon,
  })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Not your salon' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT token' })
  async findOne(@Param('uuid') uuid: string, @CurrentCustomer() currentCustomer: any): Promise<Salon> {
    // Check if customer has access to this salon
    const customerSalons = await this.salonsService.findByCustomer(currentCustomer.customer.uuid);
    const hasAccess = customerSalons.some(salon => salon.uuid === uuid);
    
    if (!hasAccess) {
      throw new NotFoundException(`Salon with ID ${uuid} not found`);
    }
    
    return await this.salonsService.findOne(uuid);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update salon by ID (if customer has access)' })
  @ApiResponse({
    status: 200,
    description: 'Salon updated successfully',
    type: Salon,
  })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied - Not your salon' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT token' })
  async update(
    @Param('uuid') uuid: string,
    @Body() updateSalonDto: UpdateSalonDto,
    @CurrentCustomer() currentCustomer: any,
  ): Promise<Salon> {
    // Check if customer has access to this salon
    const customerSalons = await this.salonsService.findByCustomer(currentCustomer.customer.uuid);
    const hasAccess = customerSalons.some(salon => salon.uuid === uuid);
    
    if (!hasAccess) {
      throw new NotFoundException(`Salon with ID ${uuid} not found`);
    }
    
    return await this.salonsService.update(uuid, updateSalonDto);
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete salon by ID (if customer has access)' })
  @ApiResponse({ status: 204, description: 'Salon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Not your salon' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT token' })
  async remove(@Param('uuid') uuid: string, @CurrentCustomer() currentCustomer: any): Promise<void> {
    // Check if customer has access to this salon
    const customerSalons = await this.salonsService.findByCustomer(currentCustomer.customer.uuid);
    const hasAccess = customerSalons.some(salon => salon.uuid === uuid);
    
    if (!hasAccess) {
      throw new NotFoundException(`Salon with ID ${uuid} not found`);
    }
    
    await this.salonsService.remove(uuid);
  }
}
