import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PlansService } from '../plans/plans.service';
import { CustomersService } from 'src/customers/customers.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { Subscription, SUBSCRIPTION_STATUS, SUBSCRIPTION_TABLE_NAME } from './entities/subscription.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PAYMENT_STATUS, PAYMENT_TABLE_NAME } from './entities/payment.entity';
import {
  PaymentHistoryItemDto,
  PaymentHistoryResponseDto,
  PaymentHistoryQueryDto,
  SubscriptionHistoryResponseDto,
  SubscriptionHistoryItemDto,
  SubscriptionHistoryQueryDto,
} from './payments.dto';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly plansService: PlansService,
    private readonly customerService: CustomersService,
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  private async clearPaymentCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(PAYMENT_TABLE_NAME);
  }

  private async clearSubscriptionCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(SUBSCRIPTION_TABLE_NAME);
  }

  async getCustomerPaymentHistory(
    customerUuid: string,
    query: PaymentHistoryQueryDto,
  ): Promise<PaymentHistoryResponseDto> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const cacheFilters: Record<string, any> = {
      customerUuid,
      page,
      limit,
    };

    if (query?.paymentStatus) {
      cacheFilters.paymentStatus = query.paymentStatus;
    }

    if (query?.subscriptionStatus) {
      cacheFilters.subscriptionStatus = query.subscriptionStatus;
    }

    if (query?.planUuid) {
      cacheFilters.planUuid = query.planUuid;
    }

    return await this.cacheService.caching(
      PAYMENT_TABLE_NAME,
      cacheFilters,
      async () => {
        const skip = (page - 1) * limit;

        const qb = this.paymentRepository
          .createQueryBuilder('payment')
          .leftJoinAndSelect('payment.subscription', 'subscription')
          .where('payment.customerUuid = :customerUuid', { customerUuid })
          .orderBy('payment.createdAt', 'DESC')
          .addOrderBy('payment.uuid', 'DESC');

        if (query?.paymentStatus) {
          qb.andWhere('payment.status = :paymentStatus', { paymentStatus: query.paymentStatus });
        }

        if (query?.subscriptionStatus) {
          qb.andWhere('subscription.status = :subscriptionStatus', {
            subscriptionStatus: query.subscriptionStatus,
          });
        }

        if (query?.planUuid) {
          qb.andWhere('subscription.planUuid = :planUuid', { planUuid: query.planUuid });
        }

        const [payments, total] = await qb.skip(skip).take(limit).getManyAndCount();

        const items = payments.map((payment) => {
          const subscription = payment.subscription
            ? {
                uuid: payment.subscription.uuid,
                stripeSubscriptionUuid: payment.subscription.stripeSubscriptionUuid,
                planUuid: payment.subscription.planUuid,
                status: payment.subscription.status,
                currentPeriodEndAt: payment.subscription.currentPeriodEndAt ?? null,
              }
            : null;

          return {
            uuid: payment.uuid,
            stripeInvoiceUuid: payment.stripeInvoiceUuid,
            stripePaymentIntentUuid: payment.stripePaymentIntentUuid,
            amountPaid: payment.amountPaid,
            currency: payment.currency,
            status: payment.status,
            paidAt: payment.paidAt ?? null,
            createdAt: payment.createdAt,
            subscription,
          } satisfies PaymentHistoryItemDto;
        });

        return new PaymentHistoryResponseDto(items, total, page, limit);
      },
    );
  }

  async getCustomerSubscriptionHistory(
    customerUuid: string,
    query: SubscriptionHistoryQueryDto,
  ): Promise<SubscriptionHistoryResponseDto> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const cacheFilters: Record<string, any> = {
      customerUuid,
      page,
      limit,
    };

    if (query?.status) {
      cacheFilters.status = query.status;
    }

    if (query?.planUuid) {
      cacheFilters.planUuid = query.planUuid;
    }

    if (query?.startFrom) {
      cacheFilters.startFrom = query.startFrom;
    }

    if (query?.startTo) {
      cacheFilters.startTo = query.startTo;
    }

    if (query?.endFrom) {
      cacheFilters.endFrom = query.endFrom;
    }

    if (query?.endTo) {
      cacheFilters.endTo = query.endTo;
    }

    return await this.cacheService.caching(
      SUBSCRIPTION_TABLE_NAME,
      cacheFilters,
      async () => {
        const skip = (page - 1) * limit;

        const qb = this.subscriptionRepository
          .createQueryBuilder('subscription')
          .leftJoinAndSelect('subscription.plan', 'plan')
          .where('subscription.customerUuid = :customerUuid', { customerUuid })
          .orderBy('subscription.createdAt', 'DESC')
          .addOrderBy('subscription.uuid', 'DESC');

        if (query?.status) {
          qb.andWhere('subscription.status = :status', { status: query.status });
        }

        if (query?.planUuid) {
          qb.andWhere('subscription.planUuid = :planUuid', { planUuid: query.planUuid });
        }

        if (query?.startFrom) {
          qb.andWhere('subscription.currentPeriodStartAt >= :startFrom', {
            startFrom: new Date(query.startFrom),
          });
        }

        if (query?.startTo) {
          qb.andWhere('subscription.currentPeriodStartAt <= :startTo', {
            startTo: new Date(query.startTo),
          });
        }

        if (query?.endFrom) {
          qb.andWhere('subscription.currentPeriodEndAt >= :endFrom', {
            endFrom: new Date(query.endFrom),
          });
        }

        if (query?.endTo) {
          qb.andWhere('subscription.currentPeriodEndAt <= :endTo', {
            endTo: new Date(query.endTo),
          });
        }

        const [subscriptions, total] = await qb.skip(skip).take(limit).getManyAndCount();

        const items = subscriptions.map((subscription) => {
          const plan = subscription.plan
            ? {
                uuid: subscription.plan.uuid,
                name: subscription.plan.name,
                description: subscription.plan.description ?? null,
                status: subscription.plan.status,
                type: subscription.plan.type,
                priceCents: subscription.plan.priceCents,
                currency: subscription.plan.currency,
                billingInterval: subscription.plan.billingInterval ?? null,
                billingIntervalCount: subscription.plan.billingIntervalCount ?? null,
                trialPeriodDays: subscription.plan.trialPeriodDays ?? null,
                stripePlanId: subscription.plan.stripePlanId ?? null,
                stripePriceId: subscription.plan.stripePriceId ?? null,
              }
            : null;

          return {
            uuid: subscription.uuid,
            stripeSubscriptionUuid: subscription.stripeSubscriptionUuid,
            planUuid: subscription.planUuid,
            status: subscription.status,
            currentPeriodStartAt: subscription.currentPeriodStartAt ?? null,
            currentPeriodEndAt: subscription.currentPeriodEndAt ?? null,
            trialStartAt: subscription.trialStartAt ?? null,
            trialEndAt: subscription.trialEndAt ?? null,
            cancelAt: subscription.cancelAt ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt ?? null,
            paidAt: subscription.paidAt ?? null,
            latestInvoiceId: subscription.latestInvoiceId ?? null,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
            plan,
          } satisfies SubscriptionHistoryItemDto;
        });

        return new SubscriptionHistoryResponseDto(items, total, page, limit);
      },
    );
  }

  private toDateFromUnix(timestamp?: number | null): Date | null {
    return typeof timestamp === 'number' ? new Date(timestamp * 1000) : null;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SUBSCRIPTION_STATUS {
    switch (status) {
      case 'active':
        return SUBSCRIPTION_STATUS.ACTIVE;
      case 'trialing':
        return SUBSCRIPTION_STATUS.TRIALING;
      case 'past_due':
        return SUBSCRIPTION_STATUS.PAST_DUE;
      case 'canceled':
        return SUBSCRIPTION_STATUS.CANCELED;
      case 'unpaid':
        return SUBSCRIPTION_STATUS.UNPAID;
      case 'incomplete':
        return SUBSCRIPTION_STATUS.INCOMPLETE;
      case 'incomplete_expired':
        return SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED;
      default:
        this.logger.warn(`Unhandled Stripe subscription status: ${status}`);
        return SUBSCRIPTION_STATUS.INCOMPLETE;
    }
  }

  private async persistStripeSubscription(stripeSubscription: Stripe.Subscription): Promise<void> {
    const stripeCustomerUuid =
      typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id;

    if (!stripeCustomerUuid) {
      this.logger.warn(`Subscription ${stripeSubscription.id} missing Stripe customer reference`);
      return;
    }

    let mapping;
    try {
      mapping = await this.stripeService.findByStripeCustomerUuid(stripeCustomerUuid);
    } catch (error) {
      this.logger.warn(
        `Stripe customer ${stripeCustomerUuid} not linked to an internal customer yet; skipping subscription sync`,
      );
      return;
    }

    const price = stripeSubscription.items?.data?.[0]?.price;
    const stripePriceId = typeof price === 'string' ? price : price?.id;

    if (!stripePriceId) {
      this.logger.warn(`Subscription ${stripeSubscription.id} missing price information; cannot map to plan`);
      return;
    }

    const plan = await this.plansService.findByStripePriceId(stripePriceId);
    if (!plan) {
      this.logger.error(
        `No plan found with Stripe price ${stripePriceId} for subscription ${stripeSubscription.id}`,
      );
      return;
    }

    const status = this.mapStripeStatus(stripeSubscription.status);

    const latestInvoice = stripeSubscription.latest_invoice;
    const latestInvoiceId =
      typeof latestInvoice === 'string'
        ? latestInvoice
        : latestInvoice?.id ?? null;

    const paidAt =
      typeof latestInvoice === 'string'
        ? null
        : this.toDateFromUnix(latestInvoice?.status_transitions?.paid_at ?? null);

    await this.subscriptionService.upsertSubscription({
      stripeSubscriptionUuid: stripeSubscription.id,
      planUuid: plan.uuid,
      customerUuid: mapping.customerUuid,
      status,
      currentPeriodStartAt: this.toDateFromUnix(stripeSubscription.current_period_start),
      currentPeriodEndAt: this.toDateFromUnix(stripeSubscription.current_period_end),
      trialStartAt: this.toDateFromUnix(stripeSubscription.trial_start),
      trialEndAt: this.toDateFromUnix(stripeSubscription.trial_end),
      cancelAt: this.toDateFromUnix(stripeSubscription.cancel_at),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
      canceledAt: this.toDateFromUnix(stripeSubscription.canceled_at),
      paidAt,
      latestInvoiceId,
    });

    await this.clearSubscriptionCaches();
  }

  private async syncStripeSubscription(stripeSubscriptionUuid: string): Promise<void> {
    try {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionUuid, {
        expand: ['items.data.price', 'customer', 'latest_invoice'],
      });
      await this.persistStripeSubscription(stripeSubscription);
    } catch (error) {
      this.logger.error(`Failed to sync Stripe subscription ${stripeSubscriptionUuid}`, error);
    }
  }

  private async updateSubscriptionStatus(stripeSubscriptionUuid: string, status: SUBSCRIPTION_STATUS): Promise<void> {
    if (!stripeSubscriptionUuid) {
      this.logger.warn('Attempted to update subscription status without subscription identifier');
      return;
    }

    try {
      const existing = await this.subscriptionService.updateStatus(stripeSubscriptionUuid, status);
      if (!existing) {
        await this.syncStripeSubscription(stripeSubscriptionUuid);
        await this.subscriptionService.updateStatus(stripeSubscriptionUuid, status);
      }
      await this.clearSubscriptionCaches();
    } catch (error) {
      this.logger.error(`Failed to update subscription ${stripeSubscriptionUuid} status to ${status}`, error);
    }
  }

  private async updateSubscriptionStatusFromInvoice(
    invoiceId: string,
    status: SUBSCRIPTION_STATUS,
  ): Promise<Stripe.Invoice | null> {
    if (!invoiceId) {
      this.logger.warn('Attempted to update subscription status without invoice identifier');
      return null;
    }

    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['subscription', 'lines.data.price', 'customer'],
      });

      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

      if (!subscriptionId) {
        this.logger.warn(`Invoice ${invoiceId} missing subscription reference`);
        return invoice;
      }

      await this.updateSubscriptionStatus(subscriptionId, status);

      if (status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.TRIALING) {
        await this.syncStripeSubscription(subscriptionId);
      }
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to update subscription status using invoice ${invoiceId}`, error);
      return null;
    }
  }

  private async handlePaymentIntentEvent(event: Stripe.Event, status: SUBSCRIPTION_STATUS): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId =
      typeof paymentIntent.invoice === 'string'
        ? paymentIntent.invoice
        : paymentIntent.invoice?.id;

    let stripeSubscriptionUuid: string | null = null;
    let stripeCustomerUuid: string | null = null;

    if (invoiceId) {
      const invoice = await this.updateSubscriptionStatusFromInvoice(invoiceId, status);

      if (invoice) {
        stripeSubscriptionUuid =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id ?? null;

        stripeCustomerUuid =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id ?? null;
      }
    }

    if (!stripeSubscriptionUuid) {
      const metadataSubscriptionId =
        paymentIntent.metadata?.subscription_id ||
        paymentIntent.metadata?.subscriptionUuid ||
        paymentIntent.metadata?.subscription ||
        paymentIntent.metadata?.stripe_subscription_uuid;

      if (metadataSubscriptionId) {
        stripeSubscriptionUuid = metadataSubscriptionId;
        await this.updateSubscriptionStatus(metadataSubscriptionId, status);
        if (status === SUBSCRIPTION_STATUS.ACTIVE) {
          await this.syncStripeSubscription(metadataSubscriptionId);
        }
      } else {
        this.logger.warn(`Payment intent ${paymentIntent.id} missing subscription reference for status update`);
      }
    }

    if (!stripeCustomerUuid) {
      stripeCustomerUuid =
        typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer?.id ?? null;
    }

    await this.recordPaymentIntent({
      paymentIntent,
      targetStatus: status,
      stripeInvoiceUuid: invoiceId,
      stripeSubscriptionUuid,
      stripeCustomerUuid,
    });
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn(`Invoice ${invoice.id} payment failed but no subscription reference found`);
      return;
    }

    await this.updateSubscriptionStatus(subscriptionId, SUBSCRIPTION_STATUS.PAST_DUE);
  }

  private async handleSubscriptionTrialWillEnd(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    await this.updateSubscriptionStatus(subscription.id, SUBSCRIPTION_STATUS.TRIALING);
  }

  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    try {
      await this.subscriptionService.removeByStripeSubscriptionUuid(subscription.id);
      await this.clearSubscriptionCaches();
    } catch (error) {
      this.logger.error(`Failed to remove subscription ${subscription.id} after deletion event`, error);
    }
  }

  private mapPaymentStatus(targetStatus: SUBSCRIPTION_STATUS, paymentIntent: Stripe.PaymentIntent): PAYMENT_STATUS {
    if (paymentIntent.status === 'succeeded' || targetStatus === SUBSCRIPTION_STATUS.ACTIVE) {
      return PAYMENT_STATUS.PAID;
    }

    if (targetStatus === SUBSCRIPTION_STATUS.INCOMPLETE || paymentIntent.status === 'requires_payment_method') {
      return PAYMENT_STATUS.FAILED;
    }

    return PAYMENT_STATUS.PENDING;
  }

  private async recordPaymentIntent(params: {
    paymentIntent: Stripe.PaymentIntent;
    targetStatus: SUBSCRIPTION_STATUS;
    stripeInvoiceUuid?: string | null;
    stripeSubscriptionUuid?: string | null;
    stripeCustomerUuid?: string | null;
  }): Promise<void> {
    const {
      paymentIntent,
      targetStatus,
      stripeInvoiceUuid,
      stripeSubscriptionUuid,
      stripeCustomerUuid,
    } = params;

    if (!stripeInvoiceUuid) {
      this.logger.warn(`Skipping payment intent ${paymentIntent.id} persistence because invoice reference is missing`);
      return;
    }

    if (!stripeCustomerUuid) {
      this.logger.warn(`Skipping payment intent ${paymentIntent.id} persistence because Stripe customer reference is missing`);
      return;
    }

    let customerUuid: string;
    try {
      const mapping = await this.stripeService.findByStripeCustomerUuid(stripeCustomerUuid);
      customerUuid = mapping.customerUuid;
    } catch (error) {
      this.logger.warn(
        `Stripe customer ${stripeCustomerUuid} not linked to an internal customer; skipping payment record for intent ${paymentIntent.id}`,
      );
      return;
    }

    let subscriptionUuid: string | null = null;
    if (stripeSubscriptionUuid) {
      try {
        const subscription = await this.subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionUuid);
        subscriptionUuid = subscription?.uuid ?? null;
      } catch (error) {
        this.logger.warn(`Failed to resolve subscription for Stripe subscription ${stripeSubscriptionUuid}`);
      }
    }

    const amountCents = paymentIntent.amount_received ?? paymentIntent.amount ?? 0;
    const amountPaid = (amountCents / 100).toFixed(2);
    const currency = (paymentIntent.currency ?? 'usd').toLowerCase();
    const paymentStatus = this.mapPaymentStatus(targetStatus, paymentIntent);
    const paidAt = paymentStatus === PAYMENT_STATUS.PAID ? this.toDateFromUnix(paymentIntent.created) : null;

    try {
      let paymentRecord = await this.paymentRepository.findOne({
        where: { stripePaymentIntentUuid: paymentIntent.id },
      });

      if (!paymentRecord) {
        paymentRecord = this.paymentRepository.create({
          customerUuid,
          subscriptionUuid,
          stripeInvoiceUuid,
          stripePaymentIntentUuid: paymentIntent.id,
          amountPaid,
          currency,
          status: paymentStatus,
          paidAt,
        });
      } else {
        paymentRecord.customerUuid = customerUuid;
        paymentRecord.subscriptionUuid = subscriptionUuid;
        paymentRecord.stripeInvoiceUuid = stripeInvoiceUuid;
        paymentRecord.amountPaid = amountPaid;
        paymentRecord.currency = currency;
        paymentRecord.status = paymentStatus;
        paymentRecord.paidAt = paidAt;
      }

      await this.paymentRepository.save(paymentRecord);
      await this.clearPaymentCaches();
    } catch (error) {
      this.logger.error(`Failed to persist payment intent ${paymentIntent.id} to payments table`, error);
    }
  }

  /**
   * Create a checkout session for subscription with trial
   */
  async createCheckoutSession(
    planUuid: string,
    successUrl: string,
    cancelUrl: string,
    customer: Customer,
  ) {
    try {
      // Get plan from database
      const plan = await this.plansService.findOne(planUuid);
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      if (!customer?.uuid) {
        throw new NotFoundException('Customer not found');
      }

      const existingSubscription = await this.subscriptionService.findCurrentByCustomer(customer.uuid);
      if (existingSubscription) {
        throw new ConflictException('You already have an active subscription');
      }

      // Ensure Stripe plan and price exist
      let priceId = plan.stripePriceId;

      // Create checkout session with trial
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        automatic_tax: { enabled: false },
        billing_address_collection: 'auto',
      };

      sessionOptions.client_reference_id = customer.uuid;
      sessionOptions.metadata = {
        ...(sessionOptions.metadata ?? {}),
        customerUuid: customer.uuid,
        planUuid: plan.uuid,
      };

      try {
        const mapping = await this.stripeService.findByCustomerUuid(customer.uuid);
        if (mapping?.stripeCustomerUuid) {
          sessionOptions.customer = mapping.stripeCustomerUuid;
        } else if (customer.email) {
          sessionOptions.customer_email = customer.email;
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          if (customer.email) {
            sessionOptions.customer_email = customer.email;
          }
        } else {
          this.logger.warn('Failed to resolve Stripe customer mapping during checkout session creation', error);
        }
      }

      // Add trial period if plan has trial days
      if (plan.trialPeriodDays && plan.trialPeriodDays > 0) {
        sessionOptions.subscription_data = {
          trial_period_days: plan.trialPeriodDays,
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionOptions);

      return {
        sessionId: session.id,
        url: session.url,
        trialDays: plan.trialPeriodDays,
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session', error);
      throw error;
    }
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId: string, customer: Customer) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      if (!customer?.uuid) {
        throw new NotFoundException('Customer not found');
      }

      const sessionCustomerUuid =
        session.client_reference_id ??
        (typeof session.metadata?.customerUuid === 'string' ? session.metadata.customerUuid : undefined);

      if (sessionCustomerUuid && sessionCustomerUuid !== customer.uuid) {
        throw new ForbiddenException('You do not have access to this checkout session');
      }

      return {
        sessionId: session.id,
        status: session.status,
        customer: session.customer,
        subscription: session.subscription,
        paymentStatus: session.payment_status,
      };
    } catch (error) {
      this.logger.error('Failed to get checkout session', error);
      throw error;
    }
  }

  /**
   * Get subscription details including trial information
   */
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        customer: subscription.customer,
      };
    } catch (error) {
      this.logger.error('Failed to get subscription', error);
      throw error;
    }
  }

  /**
   * Cancel subscription at period end (graceful cancellation)
   */
  async cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return {
        id: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  /**
   * Immediately cancel subscription
   */
  async cancelSubscriptionNow(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);

      return {
        id: subscription.id,
        status: subscription.status,
        canceledAt: new Date(subscription.canceled_at! * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to immediately cancel subscription', error);
      throw error;
    }
  }

  /**
   * Handle webhook events including trial events
   */
  async handleWebhook(body: string | Buffer, signature: string) {
    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      // Ensure body is a string or buffer for Stripe
      const bodyStr = typeof body === 'string' ? body : body?.toString();
      const event = this.stripe.webhooks.constructEvent(bodyStr, signature, webhookSecret);
      
      this.logger.log(`Received webhook event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;
          
        // Payment events
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentEvent(event, SUBSCRIPTION_STATUS.ACTIVE);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentEvent(event, SUBSCRIPTION_STATUS.INCOMPLETE);
          break;

        // Subscription events
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.persistStripeSubscription(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;

        // Trial events
        case 'customer.subscription.trial_will_end':
          await this.handleSubscriptionTrialWillEnd(event);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Failed to handle webhook', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Handle checkout completed event to link Stripe customer to internal customer
   */
  async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeCustomerUuid =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!stripeCustomerUuid) {
      this.logger.warn(`Checkout completed event ${event.id} missing Stripe customer identifier`);
      return;
    }

    // If we already have a mapping, nothing else to do
    try {
      await this.stripeService.findByStripeCustomerUuid(stripeCustomerUuid);
      this.logger.debug(`Stripe customer ${stripeCustomerUuid} already linked to an internal customer`);
      return;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        this.logger.error('Error looking up Stripe customer mapping', error);
        throw error;
      }
    }

    const clientReferenceId = session.client_reference_id;
    if (!clientReferenceId) {
      this.logger.warn(
        `Checkout session ${session.id} missing client_reference_id; cannot link Stripe customer ${stripeCustomerUuid} to internal customer`,
      );
      return;
    }

    try {
      const customer = await this.customerService.findOneByUuid(clientReferenceId);
      await this.stripeService.upsertStripeCustomer(stripeCustomerUuid, customer.uuid);
      this.logger.log(`Linked Stripe customer ${stripeCustomerUuid} to customer ${customer.uuid}`);

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (subscriptionId) {
        await this.syncStripeSubscription(subscriptionId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to link Stripe customer ${stripeCustomerUuid} with internal customer ${clientReferenceId}`,
        error,
      );
      throw error;
    }
  }
}