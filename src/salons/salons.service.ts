import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSalonDto, UpdateSalonDto } from './dto/salon.dto';
import { Salon, SALON_TABLE_NAME } from './entities/salon.entity';
import { CustomerSalon } from '../customers/entities/customer-salon.entity';
import { CacheService } from '../common/services/cache.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class SalonsService {
  constructor(
    @InjectRepository(Salon)
    private readonly salonRepository: Repository<Salon>,
    @InjectRepository(CustomerSalon)
    private readonly customerSalonRepository: Repository<CustomerSalon>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all salon-related caches including related entities
   */
  private async clearSalonCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(SALON_TABLE_NAME);
  }

  async create(createSalonDto: CreateSalonDto): Promise<Salon> {
    const salon = this.salonRepository.create(createSalonDto);
    const savedSalon = await this.salonRepository.save(salon);
    
    // Clear cache after create
    await this.clearSalonCaches();
    
    return savedSalon;
  }

  async findAllPaginated(
    paginationDto: PaginationDto, 
    customerUuid: string,
    status?: string,
    search?: string
  ): Promise<PaginatedResponse<Salon>> {
    const { page, limit } = paginationDto;
    return await this.cacheService.caching(
      SALON_TABLE_NAME,
      { page, limit, customerUuid, status, search },
      async () => {
        // Get salons belonging to the specific customer with pagination
        const queryBuilder = this.salonRepository
          .createQueryBuilder('salon')
          .innerJoin(CustomerSalon, 'cs', 'cs.salonUuid = salon.uuid')
          .where('cs.customerUuid = :customerUuid', { customerUuid });

        // Add status filter if provided
        if (status) {
          queryBuilder.andWhere('salon.status = :status', { status });
        }

        // Add search filter if provided
        if (search) {
          queryBuilder.andWhere(
            '(salon.name LIKE :search OR salon.address LIKE :search OR salon.email LIKE :search)',
            { search: `%${search}%` }
          );
        }

        queryBuilder.orderBy('salon.createdAt', 'DESC');

        const [salons, total] = await queryBuilder
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

        return new PaginatedResponse(salons, total, page, limit);
      }
    );
  }

  async findOne(uuid: string): Promise<Salon> {
    return await this.cacheService.caching(
      SALON_TABLE_NAME,
      { id: uuid },
      async () => {
        const salon = await this.salonRepository.findOne({
          where: { uuid },
        });

        if (!salon) {
          throw new NotFoundException(`Salon with ID ${uuid} not found`);
        }

        return salon;
      }
    );
  }

  async update(uuid: string, updateSalonDto: UpdateSalonDto): Promise<Salon> {
    const salon = await this.findOne(uuid);
    Object.assign(salon, updateSalonDto);
    const updatedSalon = await this.salonRepository.save(salon);
    
    // Clear cache after update
    await this.clearSalonCaches();
    
    return updatedSalon;
  }

  async remove(uuid: string): Promise<void> {
    const salon = await this.findOne(uuid);
    await this.salonRepository.remove(salon);
    
    // Clear cache after delete
    await this.clearSalonCaches();
  }

  async findByStatus(status: string): Promise<Salon[]> {
    return await this.cacheService.caching(
      SALON_TABLE_NAME,
      { status },
      async () => {
        return await this.salonRepository.find({
          where: { status },
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findByEmail(email: string): Promise<Salon | null> {
    return await this.cacheService.caching(
      SALON_TABLE_NAME,
      { email },
      async () => {
        return await this.salonRepository.findOne({
          where: { email },
        });
      }
    );
  }

  async search(query: string): Promise<Salon[]> {
    return await this.cacheService.caching(
      SALON_TABLE_NAME,
      { search: query },
      async () => {
        return await this.salonRepository
          .createQueryBuilder('salon')
          .where('salon.name LIKE :query', { query: `%${query}%` })
          .orWhere('salon.address LIKE :query', { query: `%${query}%` })
          .orWhere('salon.email LIKE :query', { query: `%${query}%` })
          .orderBy('salon.createdAt', 'DESC')
          .getMany();
      }
    );
  }

  async findByCustomer(customerUuid: string): Promise<Salon[]> {
    return await this.cacheService.caching(
      SALON_TABLE_NAME,
      { customerUuid },
      async () => {
        return await this.salonRepository
          .createQueryBuilder('salon')
          .innerJoin(CustomerSalon, 'cs', 'cs.salonUuid = salon.uuid')
          .where('cs.customerUuid = :customerUuid', { customerUuid })
          .orderBy('salon.createdAt', 'DESC')
          .getMany();
      }
    );
  }
}
