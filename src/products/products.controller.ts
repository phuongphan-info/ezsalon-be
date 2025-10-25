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
import { CreateProductDto, UpdateProductDto, ProductResponseDto, PublicProductResponseDto } from './dto/product.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { ProductsService } from './products.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Product, PRODUCT_STATUS, PRODUCT_TYPE } from './entities/product.entity';
import { PermissionHelper } from '../roles/helpers/permission.helper';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly permissionHelper: PermissionHelper,
  ) {}

  @Get('public')
  @ApiOperation({ summary: 'Get all active products (public access)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Active products retrieved successfully',
    type: [PublicProductResponseDto]
  })
  async findActivePublic(): Promise<PublicProductResponseDto[]> {
    return this.productsService.findActivePublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('products:create')
  @ApiOperation({ summary: 'Create a new product plan' })
  @ApiResponse({ 
    status: 201, 
    description: 'Product created successfully',
    type: ProductResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - products:create permission required' })
  @ApiResponse({ status: 409, description: 'Conflict - Product with this name or Stripe ID already exists' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() currentUser: any,
  ): Promise<Product> {
    return this.productsService.create(createProductDto, currentUser.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('products:read', 'products:read-all')
  @ApiOperation({ summary: 'Get products with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product name' })
  @ApiQuery({ name: 'status', required: false, enum: PRODUCT_STATUS, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: PRODUCT_TYPE, description: 'Filter by type' })
  @ApiResponse({ 
    status: 200, 
    description: 'Products retrieved successfully. Returns user\'s products with products:read permission, or all products with products:read-all permission',
    type: PaginatedResponse<ProductResponseDto>
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - products:read or products:read-all permission required' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ): Promise<PaginatedResponse<Product>> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'products:read-all',
    );
    if (hasReadAllPermission) {
      return await this.productsService.findAllPaginated(paginationDto, search, status, type);
    }
    return await this.productsService.findAllPaginated(paginationDto, search, status, type, currentUser.userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('products:read-all')
  @ApiOperation({ summary: 'Get product statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Product statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        inactive: { type: 'number' },
        draft: { type: 'number' },
        subscription: { type: 'number' },
        oneTime: { type: 'number' },
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - products:read-all permission required' })
  async getStats() {
    return this.productsService.getProductStats();
  }

  @Get(':uuid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('products:read', 'products:read-all')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Product retrieved successfully',
    type: ProductResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - products:read or products:read-all permission required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('uuid') uuid: string, @CurrentUser() currentUser: any): Promise<Product> {
    const hasReadAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'products:read-all',
    );
    if (hasReadAllPermission) {
      return await this.productsService.findOne(uuid);
    }
    
    // For non-admin users, check if the product belongs to them
    const product = await this.productsService.findOne(uuid);
    if (product.createdByUuid !== currentUser.userId) {
      throw new ForbiddenException('You can only access products you created');
    }
    return product;
  }

  @Patch(':uuid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('products:update', 'products:update-all')
  @ApiOperation({ summary: 'Update a product' })  
  @ApiResponse({ 
    status: 200, 
    description: 'Product updated successfully',
    type: ProductResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - products:update or products:update-all permission required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Product with this name or Stripe ID already exists' })
  async update(@Param('uuid') uuid: string, @Body() updateProductDto: UpdateProductDto, @CurrentUser() currentUser: any): Promise<Product> {
    const hasUpdateAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'products:update-all',
    );
    if (hasUpdateAllPermission) {
      return await this.productsService.update(uuid, updateProductDto);
    }
    
    // For non-admin users, check if the product belongs to them
    const product = await this.productsService.findOne(uuid);
    if (product.createdByUuid !== currentUser.userId) {
      throw new ForbiddenException('You can only update products you created');
    }
    return await this.productsService.update(uuid, updateProductDto);
  }

  @Delete(':uuid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('products:delete', 'products:delete-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - products:delete or products:delete-all permission required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('uuid') uuid: string, @CurrentUser() currentUser: any): Promise<void> {
    const hasDeleteAllPermission = await this.permissionHelper.hasPermission(
      currentUser.userId,
      'products:delete-all',
    );
    if (hasDeleteAllPermission) {
      return await this.productsService.remove(uuid);
    }
    
    // For non-admin users, check if the product belongs to them
    const product = await this.productsService.findOne(uuid);
    if (product.createdByUuid !== currentUser.userId) {
      throw new ForbiddenException('You can only delete products you created');
    }
    return await this.productsService.remove(uuid);
  }
}
