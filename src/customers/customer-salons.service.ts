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
      { uuid },
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

  async findByCustomerUuid(customerUuid: string): Promise<CustomerSalon[]> {
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

  async isBusinessOwner(customerUuid: string, salonUuid: string): Promise<boolean> {
    return await this.isRole(customerUuid, salonUuid, CUSTOMER_SALON_ROLE.BUSINESS_OWNER);
  }

  async isOwnerManager(customerUuid: string, salonUuid: string): Promise<boolean> {
    return await this.isRole(customerUuid, salonUuid, CUSTOMER_SALON_ROLE.OWNER);
  }

  async isManager(customerUuid: string, salonUuid: string): Promise<boolean> {
    return await this.isRole(customerUuid, salonUuid, CUSTOMER_SALON_ROLE.MANAGER);
  }

  async isFrontDesk(customerUuid: string, salonUuid: string): Promise<boolean> {
    return await this.isRole(customerUuid, salonUuid, CUSTOMER_SALON_ROLE.FRONT_DESK);
  }

  async isStaff(customerUuid: string, salonUuid: string): Promise<boolean> {
    return await this.isRole(customerUuid, salonUuid, CUSTOMER_SALON_ROLE.STAFF);
  }

  async isRole(customerUuid: string, salonUuid: string, role: CUSTOMER_SALON_ROLE): Promise<boolean> {
    try {
      const salonOwnership = await this.findByCustomerAndSalon(customerUuid, salonUuid);

      return salonOwnership.roleName === role;
    } catch (error) {
      return false;
    }
  }

  async validateSalonManagementCreateCustomerWithRole(customerUuid: string, salonUuid: string, roleName: string): Promise<void> {
    if (roleName === CUSTOMER_SALON_ROLE.BUSINESS_OWNER) {
      throw new ForbiddenException(`Cannot able to create customer with ${roleName} role`);
    }
    const currentIsOwnerManager = await this.isOwnerManager(
      customerUuid,
      salonUuid
    );
    if (currentIsOwnerManager && roleName === CUSTOMER_SALON_ROLE.OWNER) {
      throw new ForbiddenException(`Cannot able to create customer with ${roleName} role`);
    }
    const currentIsManager = await this.isManager(
      customerUuid,
      salonUuid
    );
    if (currentIsManager && [CUSTOMER_SALON_ROLE.OWNER, CUSTOMER_SALON_ROLE.MANAGER].includes(roleName as CUSTOMER_SALON_ROLE)) {
      throw new ForbiddenException(`Cannot able to create customer with ${roleName} role`);
    }
  }

  async validateSalonManagementAccessCustomer(customerUuid: string, salonUuid: string, foundCustomerUuid: string): Promise<void> {
      const currentIsOwnerManager = await this.isOwnerManager(
        customerUuid,
        salonUuid
      );
      const foundCustomerIsBusinessOwner = await this.isBusinessOwner(
        foundCustomerUuid,
        salonUuid
      );
      const foundCustomerIsOwnerManager = await this.isOwnerManager(
        foundCustomerUuid,
        salonUuid
      );
      if (currentIsOwnerManager && (foundCustomerIsBusinessOwner || foundCustomerIsOwnerManager)) {
        throw new ForbiddenException(`Customer with UUID "${foundCustomerUuid}" not found in salon "${salonUuid}"`);
      }
  
      const currentIsManager = await this.isManager(
        customerUuid,
        salonUuid
      );
      const foundCustomerIsManager = await this.isManager(
        foundCustomerUuid,
        salonUuid
      );
      if (currentIsManager && (foundCustomerIsBusinessOwner || foundCustomerIsOwnerManager || foundCustomerIsManager)) {
        throw new ForbiddenException(`Customer with UUID "${foundCustomerUuid}" not found in salon "${salonUuid}"`);
      }
  }

  async validateSalonManagement(customerUuid: string, salonUuid: string): Promise<void> {
    try {
      const salonOwnership = await this.findByCustomerAndSalon(customerUuid, salonUuid);

      if (!salonOwnership) {
        throw new ForbiddenException('You do not have permission to manage this salon');
      }

      if ([CUSTOMER_SALON_ROLE.BUSINESS_OWNER, CUSTOMER_SALON_ROLE.OWNER, CUSTOMER_SALON_ROLE.MANAGER].includes(salonOwnership.roleName as CUSTOMER_SALON_ROLE) === false) {
        throw new ForbiddenException('You do not have permission to manage this salon');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(error.message);
    }
  }

  async validateSalonOwnership(customerUuid: string, salonUuid: string): Promise<void> {
    try {
      const salonOwnership = await this.findByCustomerAndSalon(customerUuid, salonUuid);
      
      if (!salonOwnership) {
        throw new ForbiddenException('Only salon owners can perform this action');
      }

      if ([CUSTOMER_SALON_ROLE.BUSINESS_OWNER, CUSTOMER_SALON_ROLE.OWNER].includes(salonOwnership.roleName as CUSTOMER_SALON_ROLE) === false) {
        throw new ForbiddenException('Only salon owners can perform this action');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(error.message);
    }
  }
}
