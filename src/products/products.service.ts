import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { Product, PRODUCT_TABLE_NAME, PRODUCT_STATUS, PRODUCT_TYPE } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CacheService } from '../common/services/cache.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all product-related caches
   */
  private async clearProductCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(PRODUCT_TABLE_NAME);
  }

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto, createdByUuid?: string): Promise<Product> {
    // Check if product with same name already exists
    const existingProduct = await this.productRepository.findOne({
      where: { name: createProductDto.name },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with name "${createProductDto.name}" already exists`);
    }

    // Check if Stripe IDs are unique if provided
    if (createProductDto.stripeProductId) {
      const existingStripeProduct = await this.productRepository.findOne({
        where: { stripeProductId: createProductDto.stripeProductId },
      });
      if (existingStripeProduct) {
        throw new ConflictException(`Product with Stripe Product ID "${createProductDto.stripeProductId}" already exists`);
      }
    }

    if (createProductDto.stripePriceId) {
      const existingStripePrice = await this.productRepository.findOne({
        where: { stripePriceId: createProductDto.stripePriceId },
      });
      if (existingStripePrice) {
        throw new ConflictException(`Product with Stripe Price ID "${createProductDto.stripePriceId}" already exists`);
      }
    }

    const product = this.productRepository.create({
      ...createProductDto,
      createdByUuid,
    });
    const savedProduct = await this.productRepository.save(product);

    // Clear cache after creating
    await this.clearProductCaches();

    return savedProduct;
  }

  /**
   * Find all products with pagination and optional filtering
   */
  async findAllPaginated(
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    type?: string,
    createdByUuid?: string,
  ): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 10 } = paginationDto;
    return await this.cacheService.caching(
      PRODUCT_TABLE_NAME,
      { page, limit, search, status, type, createdByUuid },
      async () => {
        const skip = (page - 1) * limit;

        const whereConditions: any = {};
        
        if (search) {
          whereConditions.name = Like(`%${search}%`);
        }
        
        if (status) {
          whereConditions.status = status;
        }
        
        if (type) {
          whereConditions.type = type;
        }

        if (createdByUuid) {
          whereConditions.createdByUuid = createdByUuid;
        }

        const options: FindManyOptions<Product> = {
          where: whereConditions,
          skip,
          take: limit,
          order: {
            displayOrder: 'ASC',
            createdAt: 'DESC',
          },
        };

        const [products, total] = await this.productRepository.findAndCount(options);

        return new PaginatedResponse(products, total, page, limit);
      }
    );
  }

  /**
   * Find all products without pagination
   */
  async findAll(): Promise<Product[]> {
    return await this.cacheService.caching(
      PRODUCT_TABLE_NAME,
      'all',
      async () => {
        return this.productRepository.find({
          order: {
            displayOrder: 'ASC',
            createdAt: 'DESC',
          },
        });
      }
    );
  }

  /**
   * Find a product by UUID
   */
  async findOne(uuid: string): Promise<Product> {
    return await this.cacheService.caching(
      PRODUCT_TABLE_NAME,
      { uuid },
      async () => {
        const product = await this.productRepository.findOne({ where: { uuid } });
        
        if (!product) {
          throw new NotFoundException(`Product with ID "${uuid}" not found`);
        }

        return product;
      }
    );
  }

  /**
   * Update a product
   */
  async update(uuid: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(uuid);

    // Check if new name conflicts with existing products
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const existingProduct = await this.productRepository.findOne({
        where: { name: updateProductDto.name },
      });
      if (existingProduct && existingProduct.uuid !== uuid) {
        throw new ConflictException(`Product with name "${updateProductDto.name}" already exists`);
      }
    }

    // Check if new Stripe IDs conflict with existing products
    if (updateProductDto.stripeProductId && updateProductDto.stripeProductId !== product.stripeProductId) {
      const existingStripeProduct = await this.productRepository.findOne({
        where: { stripeProductId: updateProductDto.stripeProductId },
      });
      if (existingStripeProduct && existingStripeProduct.uuid !== uuid) {
        throw new ConflictException(`Product with Stripe Product ID "${updateProductDto.stripeProductId}" already exists`);
      }
    }

    if (updateProductDto.stripePriceId && updateProductDto.stripePriceId !== product.stripePriceId) {
      const existingStripePrice = await this.productRepository.findOne({
        where: { stripePriceId: updateProductDto.stripePriceId },
      });
      if (existingStripePrice && existingStripePrice.uuid !== uuid) {
        throw new ConflictException(`Product with Stripe Price ID "${updateProductDto.stripePriceId}" already exists`);
      }
    }

    // Update the product
    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);

    // Clear cache after updating
    await this.clearProductCaches();

    return updatedProduct;
  }

  /**
   * Remove a product
   */
  async remove(uuid: string): Promise<void> {
    const product = await this.findOne(uuid);

    await this.productRepository.remove(product);

    // Clear cache after deleting
    await this.clearProductCaches();
  }

  /**
   * Get products count by status
   */
  async getProductStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    draft: number;
    subscription: number;
    oneTime: number;
  }> {
    return await this.cacheService.caching(
      PRODUCT_TABLE_NAME,
      'stats',
      async () => {
        const [
          total,
          active,
          inactive,
          draft,
          subscription,
          oneTime,
        ] = await Promise.all([
          this.productRepository.count(),
          this.productRepository.count({ where: { status: PRODUCT_STATUS.ACTIVE } }),
          this.productRepository.count({ where: { status: PRODUCT_STATUS.INACTIVE } }),
          this.productRepository.count({ where: { status: PRODUCT_STATUS.DRAFT } }),
          this.productRepository.count({ where: { type: PRODUCT_TYPE.SUBSCRIPTION } }),
          this.productRepository.count({ where: { type: PRODUCT_TYPE.ONE_TIME } }),
        ]);

        return {
          total,
          active,
          inactive,
          draft,
          subscription,
          oneTime,
        };
      }
    );
  }

  /**
   * Get all active products with limited fields for public access
   */
  async findActivePublic(): Promise<Pick<Product, 'uuid' | 'name' | 'description' | 'priceCents' | 'currency' | 'createdAt' | 'updatedAt'>[]> {
    return await this.cacheService.caching(
      PRODUCT_TABLE_NAME,
      'active_public',
      async () => {
        return this.productRepository.find({
          where: { status: PRODUCT_STATUS.ACTIVE },
          select: ['uuid', 'name', 'description', 'priceCents', 'currency', 'createdAt', 'updatedAt'],
          order: { displayOrder: 'ASC', createdAt: 'DESC' }
        });
      }
    );
  }
}