import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateCustomerSalonDto, UpdateCustomerSalonDto } from './dto/customer-salon.dto';
import { CustomerSalonsService } from './customer-salons.service';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';

@ApiTags('customer-salons')
@Controller('customer-salons')
@UseGuards(CustomerJwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomerSalonsController {
  constructor(
    private readonly customerSalonsService: CustomerSalonsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer-salon relationship' })
  @ApiResponse({ status: 201, description: 'Customer-salon relationship created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only salon owners can assign customers' })
  @ApiResponse({ status: 409, description: 'Customer-salon relationship already exists' })
  async create(@Body() createCustomerSalonDto: CreateCustomerSalonDto, @CurrentCustomer() currentCustomer: any) {
    // Check if the logged-in customer is the owner of the salon
    await this.customerSalonsService.validateSalonOwnership(
      currentCustomer.customer.uuid, 
      createCustomerSalonDto.salonUuid
    );
    
    return this.customerSalonsService.create(createCustomerSalonDto);
  }

  @Get(':salonUuid/:customerUuid')
  @ApiOperation({ summary: 'Get customer-salon relationship by salon and customer UUIDs' })
  @ApiResponse({ status: 200, description: 'Customer-salon relationship retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer-salon relationship not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only salon owners can view customer relationships' })
  async findOne(@Param('salonUuid') salonUuid: string, @Param('customerUuid') customerUuid: string, @CurrentCustomer() currentCustomer: any) {
    // Check if the logged-in customer is the owner of the salon
    await this.customerSalonsService.validateSalonOwnership(
      currentCustomer.customer.uuid, 
      salonUuid
    );
    
    return this.customerSalonsService.findByCustomerAndSalon(customerUuid, salonUuid);
  }

  @Patch(':salonUuid/:customerUuid')
  @ApiOperation({ summary: 'Update customer-salon relationship' })
  @ApiResponse({ status: 200, description: 'Customer-salon relationship updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer-salon relationship not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only salon owners can update customer relationships' })
  async update(@Param('salonUuid') salonUuid: string, @Param('customerUuid') customerUuid: string, @Body() updateCustomerSalonDto: UpdateCustomerSalonDto, @CurrentCustomer() currentCustomer: any) {
    // Check if the logged-in customer is the owner of the salon
    await this.customerSalonsService.validateSalonOwnership(
      currentCustomer.customer.uuid, 
      salonUuid
    );
    
    return this.customerSalonsService.updateByCustomerAndSalon(customerUuid, salonUuid, updateCustomerSalonDto);
  }

  @Delete(':salonUuid/:customerUuid')
  @ApiOperation({ summary: 'Delete customer-salon relationship by salon and customer UUIDs' })
  @ApiResponse({ status: 200, description: 'Customer-salon relationship deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer-salon relationship not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only salon owners can delete customer relationships' })
  async removeByCustomerAndSalon(
    @Param('salonUuid') salonUuid: string,
    @Param('customerUuid') customerUuid: string,
    @CurrentCustomer() currentCustomer: any,
  ) {
    // Check if the logged-in customer is the owner of the salon
    await this.customerSalonsService.validateSalonOwnership(
      currentCustomer.customer.uuid, 
      salonUuid
    );
    
    return this.customerSalonsService.removeByCustomerAndSalon(customerUuid, salonUuid);
  }
}
