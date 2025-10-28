import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SUBSCRIPTION_STATUS } from './entities/subscription.entity';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

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

    const saved = await this.subscriptionRepository.save(subscription);
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

    if (subscription.status !== status) {
      subscription.status = status;
      await this.subscriptionRepository.save(subscription);
      this.logger.debug(`Updated subscription ${stripeSubscriptionUuid} status to ${status}`);
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
