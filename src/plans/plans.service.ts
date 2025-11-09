import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { Plan, PLAN_TABLE_NAME, PLAN_STATUS, PLAN_TYPE, BILLING_INTERVAL } from './entities/plan.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { CacheService } from '../common/services/cache.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PublicPlanResponse } from './dto/plan.response';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly cacheService: CacheService,
  ) {}

  private normalizeBillingInterval(interval?: BILLING_INTERVAL | null): BILLING_INTERVAL {
    return interval ?? BILLING_INTERVAL.MONTH;
  }

  private normalizeBillingIntervalCount(count?: number | null): number {
    return typeof count === 'number' && count > 0 ? count : 1;
  }

  private async clearPlanCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(PLAN_TABLE_NAME);
  }

  async create(createPlanDto: CreatePlanDto, createdByUuid?: string): Promise<Plan> {
    const normalizedInterval = this.normalizeBillingInterval(createPlanDto.billingInterval);
    const normalizedIntervalCount = this.normalizeBillingIntervalCount(createPlanDto.billingIntervalCount);

    const existingPlan = await this.planRepository.findOne({
      where: {
        name: createPlanDto.name,
        billingInterval: normalizedInterval,
        billingIntervalCount: normalizedIntervalCount,
      },
    });

    if (existingPlan) {
      throw new ConflictException(
        `Plan "${createPlanDto.name}" already exists for ${normalizedInterval} billing interval (${normalizedIntervalCount})`,
      );
    }

    // Check if Stripe IDs are unique if provided
    if (createPlanDto.stripePlanId && createPlanDto.stripePriceId) {
      const existingStripePair = await this.planRepository.findOne({
        where: {
          stripePlanId: createPlanDto.stripePlanId,
          stripePriceId: createPlanDto.stripePriceId,
        },
      });
      if (existingStripePair) {
        throw new ConflictException(
          `Plan with Stripe Plan ID "${createPlanDto.stripePlanId}" and Stripe Price ID "${createPlanDto.stripePriceId}" already exists`,
        );
      }
    } else {
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
    }

    const plan = this.planRepository.create({
      ...createPlanDto,
      billingInterval: normalizedInterval,
      billingIntervalCount: normalizedIntervalCount,
      createdByUuid,
    });
    const savedPlan = await this.planRepository.save(plan);

    // Clear cache after creating
    await this.clearPlanCaches();

    return savedPlan;
  }

  async findAllPaginated(
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    type?: string,
    createdByUuid?: string,
  ): Promise<{ entities: any; total: number; page: number; limit: number }> {
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

        const [entities, total] = await this.planRepository.findAndCount(options);

        return { entities, total, page, limit };
      }
    );
  }

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

  async findByStripePriceId(stripePriceId: string): Promise<Plan | null> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
      { stripePriceId },
      async () => {
        return this.planRepository.findOne({ where: { stripePriceId } });
      }
    );
  }

  async update(uuid: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(uuid);
    const targetName = updatePlanDto.name ?? plan.name;
    const targetInterval = this.normalizeBillingInterval(updatePlanDto.billingInterval ?? plan.billingInterval);
    const targetIntervalCount = this.normalizeBillingIntervalCount(
      updatePlanDto.billingIntervalCount ?? plan.billingIntervalCount,
    );

    const existingPlanWithSchedule = await this.planRepository.findOne({
      where: {
        name: targetName,
        billingInterval: targetInterval,
        billingIntervalCount: targetIntervalCount,
      },
    });
    if (existingPlanWithSchedule && existingPlanWithSchedule.uuid !== uuid) {
      throw new ConflictException(
        `Plan "${targetName}" already exists for ${targetInterval} billing interval (${targetIntervalCount})`,
      );
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
  plan.name = targetName;
  plan.billingInterval = targetInterval;
  plan.billingIntervalCount = targetIntervalCount;
    const updatedPlan = await this.planRepository.save(plan);

    // Clear cache after updating
    await this.clearPlanCaches();

    return updatedPlan;
  }

  async remove(uuid: string): Promise<void> {
    const plan = await this.findOne(uuid);

    await this.planRepository.remove(plan);

    // Clear cache after deleting
    await this.clearPlanCaches();
  }

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

  async findActivePublic(): Promise<PublicPlanResponse[]> {
    return await this.cacheService.caching(
      PLAN_TABLE_NAME,
      'active_public',
      async () => {
        return await this.planRepository.find({
          where: { status: PLAN_STATUS.ACTIVE },
          order: { displayOrder: 'DESC', createdAt: 'DESC' }
        });
      }
    );
  }
}