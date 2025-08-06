import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CustomerSalon, CUSTOMER_SALON_ROLE, CUSTOMER_SALON_TABLE_NAME } from './entities/customer-salon.entity';
import { CreateCustomerSalonDto, UpdateCustomerSalonDto } from './dto/customer-salon.dto';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class CustomerSalonsService {
  constructor(
    @InjectRepository(CustomerSalon)
    private readonly customerSalonRepository: Repository<CustomerSalon>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all customer-salon-related caches including related entities
   */
  private async clearCustomerSalonCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(CUSTOMER_SALON_TABLE_NAME);
  }

  async create(createCustomerSalonDto: CreateCustomerSalonDto): Promise<CustomerSalon> {
    // Check if this customer-salon relationship already exists
    const existingRelationship = await this.customerSalonRepository.findOne({
      where: {
        customerUuid: createCustomerSalonDto.customerUuid,
        salonUuid: createCustomerSalonDto.salonUuid,
      },
    });

    if (existingRelationship) {
      throw new ConflictException('Customer-Salon relationship already exists');
    }

    const customerSalon = this.customerSalonRepository.create(createCustomerSalonDto);
    const savedCustomerSalon = await this.customerSalonRepository.save(customerSalon);
    
    // Clear cache after create
    await this.clearCustomerSalonCaches();
    
    return savedCustomerSalon;
  }

  async findAll(): Promise<CustomerSalon[]> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      'all',
      async () => {
        return await this.customerSalonRepository.find({
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findOne(uuid: string): Promise<CustomerSalon> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      { id: uuid },
      async () => {
        const customerSalon = await this.customerSalonRepository.findOne({
          where: { uuid },
        });
        
        if (!customerSalon) {
          throw new NotFoundException(`Customer-Salon relationship with ID ${uuid} not found`);
        }
        
        return customerSalon;
      }
    );
  }

  async findByCustomer(customerUuid: string): Promise<CustomerSalon[]> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      { customerUuid },
      async () => {
        return await this.customerSalonRepository.find({
          where: { customerUuid },
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findByCustomerUuid(customerUuid: string): Promise<CustomerSalon[]> {
    return this.findByCustomer(customerUuid);
  }

  async findBySalon(salonUuid: string): Promise<CustomerSalon[]> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      { salonUuid },
      async () => {
        return await this.customerSalonRepository.find({
          where: { salonUuid },
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findBySalonUuids(salonUuids: string[]): Promise<CustomerSalon[]> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      { salonUuids: salonUuids.sort() }, // Sort for consistent cache keys
      async () => {
        if (salonUuids.length === 0) {
          return [];
        }
        
        return await this.customerSalonRepository.find({
          where: { salonUuid: In(salonUuids) },
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findBySalonAndRole(salonUuid: string, roleName: string): Promise<CustomerSalon[]> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      { salonUuid, roleName },
      async () => {
        return await this.customerSalonRepository.find({
          where: { salonUuid, roleName },
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findByCustomerAndSalon(customerUuid: string, salonUuid: string): Promise<CustomerSalon> {
    return await this.cacheService.caching(
      CUSTOMER_SALON_TABLE_NAME,
      { customerUuid, salonUuid },
      async () => {
        const customerSalon = await this.customerSalonRepository.findOne({
          where: { customerUuid, salonUuid },
        });
        
        if (!customerSalon) {
          throw new NotFoundException(`Customer-Salon relationship not found for customer ${customerUuid} and salon ${salonUuid}`);
        }
        
        return customerSalon;
      }
    );
  }

  async update(uuid: string, updateCustomerSalonDto: UpdateCustomerSalonDto): Promise<CustomerSalon> {
    const customerSalon = await this.findOne(uuid);
    Object.assign(customerSalon, updateCustomerSalonDto);
    const updatedCustomerSalon = await this.customerSalonRepository.save(customerSalon);
    
    // Clear cache after update
    await this.clearCustomerSalonCaches();
    
    return updatedCustomerSalon;
  }

  async updateByCustomerAndSalon(customerUuid: string, salonUuid: string, updateCustomerSalonDto: UpdateCustomerSalonDto): Promise<CustomerSalon> {
    const customerSalon = await this.findByCustomerAndSalon(customerUuid, salonUuid);
    Object.assign(customerSalon, updateCustomerSalonDto);
    const updatedCustomerSalon = await this.customerSalonRepository.save(customerSalon);
    
    // Clear cache after update
    await this.clearCustomerSalonCaches();
    
    return updatedCustomerSalon;
  }

  async remove(uuid: string): Promise<void> {
    const customerSalon = await this.findOne(uuid);
    await this.customerSalonRepository.remove(customerSalon);
    
    // Clear cache after delete
    await this.clearCustomerSalonCaches();
  }

  async removeByCustomerAndSalon(customerUuid: string, salonUuid: string): Promise<void> {
    const customerSalon = await this.customerSalonRepository.findOne({
      where: { customerUuid, salonUuid },
    });
    
    if (customerSalon) {
      await this.customerSalonRepository.remove(customerSalon);
      
      // Clear cache after delete
      await this.clearCustomerSalonCaches();
    }
  }

  /**
   * Check if the current customer is the owner of the specified salon
   * @param customerUuid - UUID of the customer to check
   * @param salonUuid - UUID of the salon
   * @throws ForbiddenException if customer is not the salon owner
   */
  async validateSalonOwnership(customerUuid: string, salonUuid: string): Promise<void> {
    try {
      const salonOwnership = await this.customerSalonRepository.findOne({
        where: { customerUuid, salonUuid },
      });
      
      if (!salonOwnership) {
        throw new ForbiddenException('Only salon owners can perform this action');
      }
      
      if (salonOwnership.roleName !== CUSTOMER_SALON_ROLE.OWNER) {
        throw new ForbiddenException('Only salon owners can perform this action');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // If any other error occurs (database error, etc.), treat as unauthorized
      throw new ForbiddenException('Only salon owners can perform this action');
    }
  }
}
