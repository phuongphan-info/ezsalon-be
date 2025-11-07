import {
  ConflictException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository, DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Customer, CUSTOMER_TABLE_NAME } from './entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CustomerSalonsService } from './customer-salons.service';
import { CUSTOMER_SALON_ROLE, CustomerSalon } from './entities/customer-salon.entity';
import { CacheService } from '../common/services/cache.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly customerSalonsService: CustomerSalonsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all customer-related caches including related entities
   */
  private async clearCustomerCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(CUSTOMER_TABLE_NAME);
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Check for existing customer with same email
    const existingCustomerByEmail = await this.customerRepository.findOne({
      where: { email: createCustomerDto.email },
    });

    if (existingCustomerByEmail) {
      throw new ConflictException('Customer with this email already exists');
    }

    // Check for existing customer with same phone number (if provided)
    if (createCustomerDto.phone) {
      const existingCustomerByPhone = await this.customerRepository.findOne({
        where: { phone: createCustomerDto.phone },
      });

      if (existingCustomerByPhone) {
        throw new ConflictException('Customer with this phone number already exists');
      }
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);

    // Extract salonUuid and roleName from DTO before creating customer
    const { salonUuid, roleName, ...customerData } = createCustomerDto;

    const customer = this.customerRepository.create({
      ...customerData,
      password: hashedPassword,
    });
    
    const savedCustomer = await this.customerRepository.save(customer);

    // Auto-assign customer to salon if salonUuid is provided
    if (salonUuid && !createCustomerDto.isOwner) {
      try {
        await this.customerSalonsService.create({
          customerUuid: savedCustomer.uuid,
          salonUuid: salonUuid,
          roleName: roleName || CUSTOMER_SALON_ROLE.STAFF,
        });
      } catch (error) {
        console.warn(`Failed to assign customer ${savedCustomer.uuid} to salon ${salonUuid}:`, error.message);
      }
    }

    // Clear cache after create
    await this.clearCustomerCaches();

    // Return customer without password for security
    const { password, ...customerWithoutPassword } = savedCustomer;
    return customerWithoutPassword as Customer;
  }

  async findAllPaginated(
    paginationDto: PaginationDto,
    salonUuid: string,
    customerUuid?: string | null,
    userUuid?: string | null,
    roles?: string[] | null,
    search?: string | null,
    status?: string | null
  ): Promise<PaginatedResponse<Record<string, any>>> {
    const { page, limit } = paginationDto;
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { page, limit, salonUuid, userUuid, roles },
      async () => {
        const queryBuilder = this.customerRepository
          .createQueryBuilder('customers')
          .innerJoin(CustomerSalon, 'cs', 'cs.customerUuid = customers.uuid')
          .where('cs.salonUuid = :salonUuid', { salonUuid });

        if (customerUuid) {
          queryBuilder.andWhere('cs.customerUuid = :customerUuid', { customerUuid });
        }

        if (userUuid) {
          queryBuilder.andWhere('customers.createdByUserUuid = :userUuid', { userUuid });
        }

        if (roles && roles.length > 0) {
          queryBuilder.andWhere('cs.roleName IN (:...roles)', { roles });
        }

        if (status) {
          queryBuilder.andWhere('customers.status = :status', { status });
        }

        if (search) {
          queryBuilder.andWhere(
            '(customers.name LIKE :search OR customers.email LIKE :search)',
            { search: `%${search}%` }
          );
        }

        queryBuilder.orderBy('customers.createdAt', 'DESC');
        queryBuilder.addSelect('cs.roleName', 'role');

        const [countResult] = await queryBuilder.clone().select('COUNT(DISTINCT customers.uuid)', 'count').getRawMany();
        const total = Number(countResult?.count || 0);

        const result = await queryBuilder
          .skip((page - 1) * limit)
          .take(limit)
          .getRawAndEntities();

        const customersWithRoles = result.entities.map((customer, index) => {
          const raw = result.raw[index];
          const { password, ...customerWithoutPassword } = customer;
          return plainToInstance(
            Customer,
            {
              ...customerWithoutPassword,
              roleName: raw?.role
            },
            {
              excludeExtraneousValues: false
            }
          );
        });

        return new PaginatedResponse(customersWithRoles, total, page, limit);
      }
    );
  }

  async findOne(salonUuid: string, uuid: string, userUuid?: string): Promise<Customer | (Customer & { role?: string })> {
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { salonUuid, uuid, currentUser: userUuid },
      async () => {
        const queryBuilder = this.customerRepository
          .createQueryBuilder('customers')
          .innerJoin(CustomerSalon, 'cs', 'cs.customerUuid = customers.uuid')
          .where('cs.salonUuid = :salonUuid', { salonUuid })
          .andWhere('customers.uuid = :uuid', { uuid });
          
        if (userUuid) {
          queryBuilder.andWhere('customers.createdByUserUuid = :userUuid', { userUuid });
        }

        queryBuilder.addSelect('cs.roleName', 'role');
        const result = await queryBuilder.getRawAndEntities();
        const customer = result.entities[0];
        if (customer && result.raw[0]) {
          (customer as Customer & { roleName: string }).roleName = result.raw[0].role;
        }
        return customer;
      }
    );
  }

  async findOneByUuid(uuid: string, withRole: boolean = false, userUuid?: string): Promise<Customer | (Customer & { role?: string })> {
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { uuid, withRole, currentUser: userUuid },
      async () => {
        const queryBuilder = this.customerRepository
          .createQueryBuilder('customers')
          .innerJoin(CustomerSalon, 'cs', 'cs.customerUuid = customers.uuid')
          .where('customers.uuid = :uuid', { uuid });

        if (userUuid) {
          queryBuilder.andWhere('customers.createdByUserUuid = :userUuid', { userUuid });
        }

        return await queryBuilder.getOne();
      }
    );
  }

  async update(salonUuid: string, uuid: string, updateCustomerDto: UpdateCustomerDto, userUuid?: string): Promise<Customer> {
    const customer = await this.findOne(salonUuid, uuid, userUuid);

    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingCustomerByPhone = await this.customerRepository.findOne({
        where: { phone: updateCustomerDto.phone },
      });
      if (existingCustomerByPhone) {
        throw new ConflictException('Customer with this phone number already exists');
      }
    }

    Object.assign(customer, updateCustomerDto);
    const { roleName } = updateCustomerDto;

    if (roleName) {
      await this.customerSalonsService.removeByCustomerAndSalon(customer.uuid, salonUuid);
      await this.customerSalonsService.create({
        customerUuid: customer.uuid,
        salonUuid,  
        roleName: roleName || CUSTOMER_SALON_ROLE.STAFF,
      });
    }

    const updatedCustomer = await this.customerRepository.save(customer);

    await this.clearCustomerCaches();

    return updatedCustomer;
  }

  async remove(salonUuid: string, uuid: string, userUuid?: string): Promise<void> {
    const customer = await this.findOne(salonUuid, uuid, userUuid);

    await this.customerRepository.remove(customer);

    await this.clearCustomerCaches();
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { email },
      async () => {
        return await this.customerRepository.findOne({
          where: { email },
        });
      }
    );
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { phone },
      async () => {
        return await this.customerRepository.findOne({
          where: { phone },
        });
      }
    );
  }

  async createSocialCustomer(customerData: {
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<Customer> {
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: customerData.email },
    });

    if (existingCustomer) {
      throw new ConflictException('Customer with this email already exists');
    }

    const customer = this.customerRepository.create({
      email: customerData.email,
      name: customerData.firstName && customerData.lastName 
        ? `${customerData.firstName} ${customerData.lastName}`
        : customerData.firstName || customerData.email.split('@')[0],
      password: '', // No password for social customers
      avatar: customerData.avatar,
    });

    const savedCustomer = await this.customerRepository.save(customer);
    
    await this.clearCustomerCaches();
    
    return savedCustomer;
  }

  async validatePassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }
}
