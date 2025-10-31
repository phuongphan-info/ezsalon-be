import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { Plan, PLAN_TABLE_NAME, PLAN_STATUS, PLAN_TYPE } from './entities/plan.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { CacheService } from '../common/services/cache.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clear all plan-related caches
   */
  private async clearPlanCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(PLAN_TABLE_NAME);
  }

  /**
   * Create a new plan
   */
  async create(createPlanDto: CreatePlanDto, createdByUuid?: string): Promise<Plan> {
    // Check if plan with same name already exists
    const existingPlan = await this.planRepository.findOne({
      where: { name: createPlanDto.name },
    });

    if (existingPlan) {
      throw new ConflictException(`Plan with name "${createPlanDto.name}" already exists`);
    }

    // Check if Stripe IDs are unique if provided
    if (createPlanDto.stripePlanId) {
      const existingStripePlan = await this.planRepository.findOne({
        where: { stripePlanId: createPlanDto.stripePlanId },
      });
      if (existingStripePlan) {
        throw new ConflictException(`Plan with Stripe Plan ID "${createPlanDto.stripePlanId}" already exists`);
      }
    }

    if (createPlanDto.stripePriceId) {
      const existingStripePrice = await this.planRepository.findOne({
        where: { stripePriceId: createPlanDto.stripePriceId },
      });
      if (existingStripePrice) {
        throw new ConflictException(`Plan with Stripe Price ID "${createPlanDto.stripePriceId}" already exists`);
      }
    }

    const plan = this.planRepository.create({
      ...createPlanDto,
      createdByUuid,
    });
    const savedPlan = await this.planRepository.save(plan);

    // Clear cache after creating
    await this.clearPlanCaches();

    return savedPlan;
  }

  /**
   * Find all plans with pagination and optional filtering
   */
  async findAllPaginated(
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    type?: string,
    createdByUuid?: string,
  ): Promise<PaginatedResponse<Plan>> {
    const { page = 1, limit = 10 } = paginationDto;
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
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

        const options: FindManyOptions<Plan> = {
          where: whereConditions,
          skip,
          take: limit,
          order: {
            displayOrder: 'ASC',
            createdAt: 'DESC',
          },
        };

        const [plans, total] = await this.planRepository.findAndCount(options);

        return new PaginatedResponse(plans, total, page, limit);
      }
    );
  }

  /**
   * Find all plans without pagination
   */
  async findAll(): Promise<Plan[]> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
      'all',
      async () => {
        return this.planRepository.find({
          order: {
            displayOrder: 'ASC',
            createdAt: 'DESC',
          },
        });
      }
    );
  }

  /**
   * Find a plan by UUID
   */
  async findOne(uuid: string): Promise<Plan> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
      { uuid },
      async () => {
        const plan = await this.planRepository.findOne({ where: { uuid } });
        
        if (!plan) {
          throw new NotFoundException(`Plan with ID "${uuid}" not found`);
        }

        return plan;
      }
    );
  }

  /**
   * Find a plan by Stripe Price ID
   */
  async findByStripePriceId(stripePriceId: string): Promise<Plan | null> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
      { stripePriceId },
      async () => {
        return this.planRepository.findOne({ where: { stripePriceId } });
      }
    );
  }

  /**
   * Update a plan
   */
  async update(uuid: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(uuid);

    // Check if new name conflicts with existing plans
    if (updatePlanDto.name && updatePlanDto.name !== plan.name) {
      const existingPlan = await this.planRepository.findOne({
        where: { name: updatePlanDto.name },
      });
      if (existingPlan && existingPlan.uuid !== uuid) {
        throw new ConflictException(`Plan with name "${updatePlanDto.name}" already exists`);
      }
    }

    // Check if new Stripe IDs conflict with existing plans
    if (updatePlanDto.stripePlanId && updatePlanDto.stripePlanId !== plan.stripePlanId) {
      const existingStripePlan = await this.planRepository.findOne({
        where: { stripePlanId: updatePlanDto.stripePlanId },
      });
      if (existingStripePlan && existingStripePlan.uuid !== uuid) {
        throw new ConflictException(`Plan with Stripe Plan ID "${updatePlanDto.stripePlanId}" already exists`);
      }
    }

    if (updatePlanDto.stripePriceId && updatePlanDto.stripePriceId !== plan.stripePriceId) {
      const existingStripePrice = await this.planRepository.findOne({
        where: { stripePriceId: updatePlanDto.stripePriceId },
      });
      if (existingStripePrice && existingStripePrice.uuid !== uuid) {
        throw new ConflictException(`Plan with Stripe Price ID "${updatePlanDto.stripePriceId}" already exists`);
      }
    }

    // Update the plan
    Object.assign(plan, updatePlanDto);
    const updatedPlan = await this.planRepository.save(plan);

    // Clear cache after updating
    await this.clearPlanCaches();

    return updatedPlan;
  }

  /**
   * Remove a plan
   */
  async remove(uuid: string): Promise<void> {
    const plan = await this.findOne(uuid);

    await this.planRepository.remove(plan);

    // Clear cache after deleting
    await this.clearPlanCaches();
  }

  /**
   * Get plans count by status
   */
  async getPlanStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    draft: number;
    subscription: number;
    oneTime: number;
  }> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
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
          this.planRepository.count(),
          this.planRepository.count({ where: { status: PLAN_STATUS.ACTIVE } }),
          this.planRepository.count({ where: { status: PLAN_STATUS.INACTIVE } }),
          this.planRepository.count({ where: { status: PLAN_STATUS.DRAFT } }),
          this.planRepository.count({ where: { type: PLAN_TYPE.SUBSCRIPTION } }),
          this.planRepository.count({ where: { type: PLAN_TYPE.ONE_TIME } }),
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
   * Get all active plans with limited fields for public access
   */
  async findActivePublic(): Promise<Pick<Plan, 'uuid' | 'name' | 'description' | 'priceCents' | 'currency' | 'trialPeriodDays' | 'createdAt' | 'updatedAt'>[]> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
      'active_public',
      async () => {
        return this.planRepository.find({
          where: { status: PLAN_STATUS.ACTIVE },
          select: ['uuid', 'name', 'description', 'priceCents', 'currency', 'trialPeriodDays', 'createdAt', 'updatedAt'],
          order: { displayOrder: 'ASC', createdAt: 'DESC' }
        });
      }
    );
  }
}