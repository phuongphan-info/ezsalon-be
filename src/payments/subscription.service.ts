import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SUBSCRIPTION_STATUS } from './entities/subscription.entity';
import { SalonsService } from '../salons/salons.service';
import { CustomerSalonsService } from '../customers/customer-salons.service';
import { CustomersService } from '../customers/customers.service';
import { CUSTOMER_SALON_ROLE } from '../customers/entities/customer-salon.entity';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly salonsService: SalonsService,
    private readonly customerSalonsService: CustomerSalonsService,
    private readonly customersService: CustomersService,
  ) {}

  private shouldCreateSalon(status: SUBSCRIPTION_STATUS): boolean {
    return [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING].includes(status);
  }

  private deriveSalonName(customerName?: string | null, customerEmail?: string | null): string {
    const trimmedName = customerName?.trim();
    if (trimmedName) {
      const firstWord = trimmedName.split(/\s+/)[0];
      if (firstWord) {
        return `${firstWord} Salon`;
      }
    }

    const emailLocalPart = customerEmail?.split('@')[0]?.trim();
    if (emailLocalPart) {
      const sanitized = emailLocalPart.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
      const firstWord = sanitized.split(/\s+/)[0];
      if (firstWord) {
        return `${firstWord} Salon`;
      }
    }

    return 'Your Salon';
  }

  private async resolveDefaultSalonName(customerUuid: string): Promise<string> {
    try {
      const customer = await this.customersService.findOne(customerUuid);
      return this.deriveSalonName(customer?.name, customer?.email);
    } catch (error) {
      this.logger.debug(`Falling back to default salon name for customer ${customerUuid}: ${error.message}`);
      return 'Your Salon';
    }
  }

  private async ensureCustomerSalonRelation(customerUuid: string, salonUuid: string): Promise<void> {
    try {
      await this.customerSalonsService.create({
        customerUuid,
        salonUuid,
        roleName: CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.debug(`Customer ${customerUuid} already linked to salon ${salonUuid}`);
        return;
      }
      throw error;
    }
  }

  private async ensureSubscriptionSalon(customerUuid: string, stripeSubscriptionUuid: string): Promise<string | null> {
    try {
      const salonName = await this.resolveDefaultSalonName(customerUuid);
      const salon = await this.salonsService.create({
        name: salonName,
      });

      await this.ensureCustomerSalonRelation(customerUuid, salon.uuid);
      this.logger.log(`Auto-created salon ${salon.uuid} for subscription ${stripeSubscriptionUuid}`);
      return salon.uuid;
    } catch (error) {
      this.logger.error(
        `Failed to ensure default salon for subscription ${stripeSubscriptionUuid}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async upsertSubscription(params: {
    stripeSubscriptionUuid: string;
    planUuid: string;
    customerUuid: string;
    status: SUBSCRIPTION_STATUS;
    currentPeriodStartAt?: Date | null;
    currentPeriodEndAt?: Date | null;
    trialStartAt?: Date | null;
    trialEndAt?: Date | null;
    cancelAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    paidAt?: Date | null;
    latestInvoiceId?: string | null;
  }): Promise<Subscription> {
    const {
      stripeSubscriptionUuid,
      planUuid,
      customerUuid,
      status,
      currentPeriodStartAt,
      currentPeriodEndAt,
      trialStartAt,
      trialEndAt,
      cancelAt,
      cancelAtPeriodEnd,
      canceledAt,
      paidAt,
      latestInvoiceId,
    } = params;

    let subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionUuid },
    });

    if (!subscription) {
      subscription = this.subscriptionRepository.create({
        stripeSubscriptionUuid,
        planUuid,
        customerUuid,
        status,
        currentPeriodStartAt: currentPeriodStartAt ?? null,
        currentPeriodEndAt: currentPeriodEndAt ?? null,
        trialStartAt: trialStartAt ?? null,
        trialEndAt: trialEndAt ?? null,
        cancelAt: cancelAt ?? null,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
        canceledAt: canceledAt ?? null,
        paidAt: paidAt ?? null,
        latestInvoiceId: latestInvoiceId ?? null,
        salonUuid: null,
      });
    } else {
      subscription.planUuid = planUuid;
      subscription.customerUuid = customerUuid;
      subscription.status = status;

      if (currentPeriodStartAt !== undefined) {
        subscription.currentPeriodStartAt = currentPeriodStartAt ?? null;
      }
      if (currentPeriodEndAt !== undefined) {
        subscription.currentPeriodEndAt = currentPeriodEndAt ?? null;
      }
      if (trialStartAt !== undefined) {
        subscription.trialStartAt = trialStartAt ?? null;
      }
      if (trialEndAt !== undefined) {
        subscription.trialEndAt = trialEndAt ?? null;
      }
      if (cancelAt !== undefined) {
        subscription.cancelAt = cancelAt ?? null;
      }
      if (cancelAtPeriodEnd !== undefined) {
        subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
      }
      if (canceledAt !== undefined) {
        subscription.canceledAt = canceledAt ?? null;
      }
      if (paidAt !== undefined) {
        subscription.paidAt = paidAt ?? null;
      }
      if (latestInvoiceId !== undefined) {
        subscription.latestInvoiceId = latestInvoiceId ?? null;
      }
    }

    let saved = await this.subscriptionRepository.save(subscription);

    if (this.shouldCreateSalon(saved.status) && !saved.salonUuid) {
      const salonUuid = await this.ensureSubscriptionSalon(customerUuid, stripeSubscriptionUuid);
      if (salonUuid) {
        saved.salonUuid = salonUuid;
        saved = await this.subscriptionRepository.save(saved);
      }
    }

    this.logger.debug(`Upserted subscription ${saved.stripeSubscriptionUuid} as ${saved.status}`);
    return saved;
  }

  async findByStripeSubscriptionUuid(stripeSubscriptionUuid: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionUuid },
    });
  }

  async updateStatus(stripeSubscriptionUuid: string, status: SUBSCRIPTION_STATUS): Promise<Subscription | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionUuid },
    });

    if (!subscription) {
      this.logger.warn(`Attempted to update status for unknown subscription ${stripeSubscriptionUuid}`);
      return null;
    }

    let shouldSave = false;

    if (subscription.status !== status) {
      subscription.status = status;
      shouldSave = true;
    }

    if (!subscription.salonUuid && this.shouldCreateSalon(subscription.status)) {
      const salonUuid = await this.ensureSubscriptionSalon(subscription.customerUuid, stripeSubscriptionUuid);
      if (salonUuid) {
        subscription.salonUuid = salonUuid;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await this.subscriptionRepository.save(subscription);
      this.logger.debug(`Updated subscription ${stripeSubscriptionUuid} status to ${subscription.status}`);
    }

    return subscription;
  }

  async removeByStripeSubscriptionUuid(stripeSubscriptionUuid: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionUuid },
    });

    if (!subscription) {
      this.logger.warn(`Attempted to remove unknown subscription ${stripeSubscriptionUuid}`);
      return;
    }

    await this.subscriptionRepository.remove(subscription);
    this.logger.debug(`Removed subscription ${stripeSubscriptionUuid}`);
  }
}
