import {
  ConflictException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository, In, DataSource } from 'typeorm';
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
    @InjectRepository(CustomerSalon)
    private readonly customerSalonRepository: Repository<CustomerSalon>,
    private readonly customerSalonsService: CustomerSalonsService,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Clear all customer-related caches including related entities
   */
  private async clearCustomerCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(CUSTOMER_TABLE_NAME);
  }

  /**
   * Determine customer role based on isOwner flag and salon relationships
   */
  private async determineCustomerRole(customer: Customer): Promise<string> {
    if (customer.isOwner) {
      return CUSTOMER_SALON_ROLE.BUSINESS_OWNER;
    }
    
    // Get customer's salon roles
    const customerSalons = await this.customerSalonsService.findByCustomerUuid(customer.uuid);
    
    if (customerSalons.length > 0) {
      // Get highest priority role
      const roles = customerSalons.map(cs => cs.roleName);
      if (roles.includes(CUSTOMER_SALON_ROLE.OWNER)) {
        return CUSTOMER_SALON_ROLE.OWNER;
      } else if (roles.includes(CUSTOMER_SALON_ROLE.MANAGER)) {
        return CUSTOMER_SALON_ROLE.MANAGER;
      } else if (roles.includes(CUSTOMER_SALON_ROLE.STAFF)) {
        return CUSTOMER_SALON_ROLE.STAFF;
      }
    }
    
    return CUSTOMER_SALON_ROLE.STAFF; // Default role
  }

  /**
   * Get allowed customer UUIDs based on current customer's role and salon relationships
   * @param currentCustomer - The customer making the request
   * @returns Array of customer UUIDs that the current customer can access
   */
  private async getAllowedCustomerUuids(currentCustomer: Customer): Promise<string[]> {
    // Get all customer-salon relationships for the current customer
    const customerSalons = await this.customerSalonsService.findByCustomerUuid(currentCustomer.uuid);
    
    if (customerSalons.length === 0) {
      // Customer has no salon relationships, return empty array
      return [];
    }

    // Get all salon UUIDs where the current customer has OWNER or MANAGER role
    const ownedSalons = customerSalons
      .filter(cs => cs.roleName === CUSTOMER_SALON_ROLE.OWNER)
      .map(cs => cs.salonUuid);
    
    const managedSalons = customerSalons
      .filter(cs => cs.roleName === CUSTOMER_SALON_ROLE.MANAGER)  
      .map(cs => cs.salonUuid);

    let allowedCustomerUuids: string[] = [];

    if (ownedSalons.length > 0) {
      // If user is an owner, they can see managers and staff in their salons
      const ownedSalonRelations = await this.customerSalonsService.findBySalonUuids(ownedSalons);
      allowedCustomerUuids = ownedSalonRelations
        .filter(cs => cs.roleName === CUSTOMER_SALON_ROLE.MANAGER || cs.roleName === CUSTOMER_SALON_ROLE.STAFF)
        .map(cs => cs.customerUuid);
    }

    if (managedSalons.length > 0) {
      // If user is a manager, they can see staff in their managed salons
      const managedSalonRelations = await this.customerSalonsService.findBySalonUuids(managedSalons);
      const staffUuids = managedSalonRelations
        .filter(cs => cs.roleName === CUSTOMER_SALON_ROLE.STAFF)
        .map(cs => cs.customerUuid);
      
      allowedCustomerUuids = [...allowedCustomerUuids, ...staffUuids];
    }

    // Remove duplicates and return unique customer UUIDs
    return [...new Set(allowedCustomerUuids)];
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

    // Extract salonUuid and customerRoleName from DTO before creating customer
    const { salonUuid, customerRoleName, ...customerData } = createCustomerDto;

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
          roleName: customerRoleName || CUSTOMER_SALON_ROLE.STAFF,
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

  async findAllPaginated(paginationDto: PaginationDto, currentCustomer?: Customer, currentUser?: User): Promise<PaginatedResponse<Customer & { role?: string }>> {
    const { page, limit } = paginationDto;
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { page, limit, roleAccess: currentCustomer?.uuid, currentUser: currentUser?.uuid },
      async () => {
        let customers: Customer[];
        let total: number;

        if (currentUser) {
          [customers, total] = await this.customerRepository.findAndCount({
            where: { createdByUserUuid: currentUser.uuid },
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
          });
        } else if (currentCustomer) {
          // Get allowed customer UUIDs based on role
          const allowedCustomerUuids = await this.getAllowedCustomerUuids(currentCustomer);
          
          if (allowedCustomerUuids.length === 0) {
            // No customers to show
            return new PaginatedResponse([], 0, page, limit);
          }

          // Fetch the customers with pagination
          [customers, total] = await this.customerRepository.findAndCount({
            where: { uuid: In(allowedCustomerUuids) },
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
          });
        } else {
          // If no current customer provided, get all customers (fallback behavior)
          [customers, total] = await this.customerRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
          });
        }

        // Add role information to each customer and exclude password
        const customersWithRoles = await Promise.all(
          customers.map(async (customer) => {
            const role = await this.determineCustomerRole(customer);
            const { password, ...customerWithoutPassword } = customer;
            return { ...customerWithoutPassword, role };
          })
        );

        return new PaginatedResponse(customersWithRoles, total, page, limit);
      }
    );
  }

  async findOne(uuid: string, withRole: boolean = false, currentUser?: User): Promise<Customer | (Customer & { role?: string })> {
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { uuid, withRole, currentUser: currentUser?.uuid },
      async () => {
        const where: any = { uuid };
        if (currentUser) {
          where.createdByUserUuid = currentUser.uuid;
        }
        const customer = await this.customerRepository.findOne({
          where,
        });

        if (!customer) {
          throw new ForbiddenException(`Customer with ID ${uuid} not found`);
        }

        if (withRole) {
          // Determine role and exclude password
          const role = await this.determineCustomerRole(customer);
          const { password, ...customerWithoutPassword } = customer;
          return { ...customerWithoutPassword, role } as Customer & { role: string };
        }

        // Return full customer entity (including password) for internal use
        return customer;
      }
    );
  }

  async update(uuid: string, updateCustomerDto: UpdateCustomerDto, currentUser?: User): Promise<Customer> {
    const customer = await this.findOne(uuid, false, currentUser);

    // Check for phone conflicts (if phone is being updated)
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingCustomerByPhone = await this.customerRepository.findOne({
        where: { phone: updateCustomerDto.phone },
      });
      if (existingCustomerByPhone) {
        throw new ConflictException('Customer with this phone number already exists');
      }
    }

    // Assign new values to customer
    Object.assign(customer, updateCustomerDto);
    const { salonUuid, customerRoleName } = updateCustomerDto;

    // Assign or update salon and role if provided
    if (salonUuid) {
      // Remove existing CustomerSalon relations for this customer and salon
      await this.customerSalonsService.removeByCustomerAndSalon(customer.uuid, salonUuid);
      // Create new CustomerSalon relation with new role
      await this.customerSalonsService.create({
        customerUuid: customer.uuid,
        salonUuid,
        roleName: customerRoleName || CUSTOMER_SALON_ROLE.STAFF,
      });
    }

    const updatedCustomer = await this.customerRepository.save(customer);

    // Clear cache after update
    await this.clearCustomerCaches();

    return updatedCustomer;
  }

  async remove(uuid: string, currentUser?: User): Promise<void> {
    const customer = await this.findOne(uuid, false, currentUser);
    
    // Protect admin account from deletion
    if (customer.email === 'admin@ezsalon.com') {
      throw new ForbiddenException('Cannot delete admin account');
    }
    
    // Get all salons owned by this customer
    const ownedSalons = await this.customerSalonRepository
      .createQueryBuilder('cs')
      .innerJoin('cs.salon', 'salon')
      .where('cs.customerUuid = :customerUuid', { customerUuid: uuid })
      .andWhere('cs.roleName = :role', { role: CUSTOMER_SALON_ROLE.OWNER })
      .select('salon.uuid', 'salonUuid')
      .getRawMany();

    // Delete all salons owned by this customer
    // This will cascade delete all customer_salon records for those salons
    for (const ownedSalon of ownedSalons) {
      await this.dataSource.query('DELETE FROM salons WHERE uuid = ?', [ownedSalon.salonUuid]);
    }

    // Delete the customer (this will cascade delete remaining customer_salon records)
    await this.customerRepository.remove(customer);

    // Clear cache after delete
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

  async findCustomersByRole(currentCustomer: Customer, paginationDto?: PaginationDto): Promise<Customer[] | PaginatedResponse<Customer>> {
    if (paginationDto) {
      // Use the existing findAllPaginated method for paginated results
      return await this.findAllPaginated(paginationDto, currentCustomer);
    }
    
    // For non-paginated results (backward compatibility)
    return await this.cacheService.caching(
      CUSTOMER_TABLE_NAME,
      { roleAccess: currentCustomer.uuid, pagination: false },
      async () => {
        // Get allowed customer UUIDs based on role
        const allowedCustomerUuids = await this.getAllowedCustomerUuids(currentCustomer);
        
        if (allowedCustomerUuids.length === 0) {
          return [];
        }

        // Return all results without pagination
        const customers = await this.customerRepository.find({
          where: { uuid: In(allowedCustomerUuids) },
          order: { createdAt: 'DESC' },
        });

        // Exclude password from results
        return customers.map(customer => {
          const { password, ...customerWithoutPassword } = customer;
          return customerWithoutPassword as Customer;
        });
      }
    );
  }

  async validateCustomerAccess(currentCustomer: Customer, targetCustomerUuid: string): Promise<void> {
    // Allow access to own profile
    if (currentCustomer.uuid === targetCustomerUuid) {
      return;
    }

    // Get all customers that the current customer can access based on their role
    const accessibleCustomers = await this.findCustomersByRole(currentCustomer) as Customer[];
    
    // Check if the target customer is in the list of accessible customers
    const hasAccess = accessibleCustomers.some(customer => customer.uuid === targetCustomerUuid);
    
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this customer');
    }
  }

  async createSocialCustomer(customerData: {
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<Customer> {
    // Check if customer already exists
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: customerData.email },
    });

    if (existingCustomer) {
      throw new ConflictException('Customer with this email already exists');
    }

    // Create customer without social data (will be stored in separate SocialAccount)
    const customer = this.customerRepository.create({
      email: customerData.email,
      name: customerData.firstName && customerData.lastName 
        ? `${customerData.firstName} ${customerData.lastName}`
        : customerData.firstName || customerData.email.split('@')[0],
      password: '', // No password for social customers
      avatar: customerData.avatar,
    });

    const savedCustomer = await this.customerRepository.save(customer);
    
    // Clear cache after create
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
