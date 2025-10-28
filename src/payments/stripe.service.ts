import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stripe } from './entities/stripe.entity';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    @InjectRepository(Stripe)
    private readonly stripeRepository: Repository<Stripe>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Find Stripe mapping by Stripe customer UUID
   */
  async findByStripeCustomerUuid(stripeCustomerUuid: string): Promise<Stripe> {
    return this.cacheService.caching(
      'stripe_by_stripe_customer_uuid',
      stripeCustomerUuid,
      async () => {
        const record = await this.stripeRepository.findOne({
          where: { stripeCustomerUuid },
        });
        if (!record) {
          throw new NotFoundException(`Stripe mapping not found for Stripe customer ${stripeCustomerUuid}`);
        }
        return record;
      },
    );
  }

  /**
   * Find Stripe mapping by internal customer UUID
   */
  async findByCustomerUuid(customerUuid: string): Promise<Stripe> {
    return this.cacheService.caching(
      'stripe_by_customer_uuid',
      customerUuid,
      async () => {
        const record = await this.stripeRepository.findOne({
          where: { customerUuid },
        });
        if (!record) {
          throw new NotFoundException(`Stripe mapping not found for customer ${customerUuid}`);
        }
        return record;
      },
    );
  }

  /**
   * Optionally create or upsert a Stripe mapping
   */
  async upsertStripeCustomer(stripeCustomerUuid: string, customerUuid: string): Promise<Stripe> {
    let existing: Stripe | null = null;
    try {
      existing = await this.stripeRepository.findOne({ where: { stripeCustomerUuid } });
    } catch (err) {
      this.logger.warn('Lookup failed during upsert', err as any);
    }
    if (existing) {
      if (existing.customerUuid !== customerUuid) {
        existing.customerUuid = customerUuid;
        await this.stripeRepository.save(existing);
      }
      return existing;
    }
    const created = this.stripeRepository.create({ stripeCustomerUuid, customerUuid });
    return this.stripeRepository.save(created);
  }
}
