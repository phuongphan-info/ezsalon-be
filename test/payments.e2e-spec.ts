import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { AppModule } from '../src/app.module';
import { PaymentsService } from '../src/payments/payments.service';
import { PlansService } from '../src/plans/plans.service';
import { CustomersService } from '../src/customers/customers.service';
import { StripeService } from '../src/payments/stripe.service';
import { SubscriptionService } from '../src/payments/subscription.service';
import { CacheService } from '../src/common/services/cache.service';
import { DataSource, In, Repository } from 'typeorm';
import { Plan, PLAN_STATUS, PLAN_TYPE, BILLING_INTERVAL } from '../src/plans/entities/plan.entity';
import { Payment, PAYMENT_STATUS } from '../src/payments/entities/payment.entity';
import { Subscription, SUBSCRIPTION_STATUS } from '../src/payments/entities/subscription.entity';
import { Stripe as StripeMapping } from '../src/payments/entities/stripe.entity';
import { CUSTOMER_STATUS } from '../src/customers/entities/customer.entity';
import { Salon } from '../src/salons/entities/salon.entity';
import { CustomerSalon, CUSTOMER_SALON_ROLE } from '../src/customers/entities/customer-salon.entity';

jest.setTimeout(60000);

describe('Payments / Stripe E2E', () => {
  let app: INestApplication;
  let httpServer: any;

  let paymentsService: PaymentsService;
  let plansService: PlansService;
  let customersService: CustomersService;
  let stripeService: StripeService;
  let subscriptionService: SubscriptionService;
  let cacheService: CacheService;
  let dataSource: DataSource;

  let paymentRepository: Repository<Payment>;
  let subscriptionRepository: Repository<Subscription>;
  let stripeRepository: Repository<StripeMapping>;
  let planRepository: Repository<Plan>;
  let salonRepository: Repository<Salon>;
  let customerSalonRepository: Repository<CustomerSalon>;

  const createdCustomerUuids: string[] = [];
  const createdSalonUuids: string[] = [];

  const planStripePriceId = `price_test_${Date.now()}`;
  const stripeCustomerId = 'cus_test_e2e';
  const stripeSubscriptionId = 'sub_test_e2e';
  const stripeInvoiceId = 'in_test_e2e';
  const stripeFailedInvoiceId = 'in_failed_e2e';

  const stripeSessions: Record<string, any> = {};
  const stripeSubscriptions: Record<string, any> = {};
  const stripeInvoices: Record<string, any> = {};

  let plan: Plan;
  let primaryCustomer: { uuid: string; token: string; name: string };
  let otherCustomer: { uuid: string; token: string; name: string };
  let checkoutSessionId: string;

  const stripeStub: any = {
    checkout: {
      sessions: {
        create: jest.fn(async (params: any) => {
          const id = `cs_test_${Object.keys(stripeSessions).length + 1}`;
          const session = {
            id,
            url: `https://example.stripe/${id}`,
            status: 'open',
            payment_status: 'unpaid',
            customer: params.customer ?? null,
            client_reference_id: params.client_reference_id,
            subscription: null,
            metadata: params.metadata ?? {},
          };
          stripeSessions[id] = session;
          return session;
        }),
        retrieve: jest.fn(async (id: string) => {
          const session = stripeSessions[id];
          if (!session) {
            throw new Error(`Unknown checkout session ${id}`);
          }
          return session;
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn(async (id: string) => {
        const subscription = stripeSubscriptions[id];
        if (!subscription) {
          throw new Error(`Unknown subscription ${id}`);
        }
        return subscription;
      }),
      update: jest.fn(async (id: string, params: any) => {
        const subscription = stripeSubscriptions[id];
        if (!subscription) {
          throw new Error(`Unknown subscription ${id}`);
        }
        if (typeof params.cancel_at_period_end === 'boolean') {
          subscription.cancel_at_period_end = params.cancel_at_period_end;
        }
        return subscription;
      }),
      cancel: jest.fn(async (id: string) => {
        const subscription = stripeSubscriptions[id];
        if (!subscription) {
          throw new Error(`Unknown subscription ${id}`);
        }
        subscription.status = 'canceled';
        subscription.canceled_at = Math.floor(Date.now() / 1000);
        return subscription;
      }),
    },
    invoices: {
      retrieve: jest.fn(async (id: string) => {
        const invoice = stripeInvoices[id];
        if (!invoice) {
          throw new Error(`Unknown invoice ${id}`);
        }
        return invoice;
      }),
    },
    webhooks: {
      constructEvent: jest.fn((body: any) => {
        if (Buffer.isBuffer(body)) {
          return JSON.parse(body.toString());
        }
        if (typeof body === 'string') {
          return JSON.parse(body);
        }
        return body;
      }),
    },
  };

  const baseTimestamp = Math.floor(Date.now() / 1000);

  const registerAndLoginCustomer = async (label: string) => {
    const email = `stripe-${label}-${Date.now().toString(36)}-${uuid().slice(0, 8)}@ezsalon.io`;
    const password = 'StripeTest123!';
    const phoneSuffix = (1000000000 + Math.floor(Math.random() * 9000000000)).toString();
    const displayName = `Stripe E2E ${label}`;
    const registerResponse = await request(httpServer)
      .post('/customers/register')
      .send({
        email,
        password,
        name: displayName,
        phone: `+84${phoneSuffix}`,
      });

    if (registerResponse.status !== 201) {
      throw new Error(
        `Customer registration failed with status ${registerResponse.status}: ${JSON.stringify(registerResponse.body)}`,
      );
    }

    const { customer } = registerResponse.body;
    const customerUuid = customer.uuid;
    createdCustomerUuids.push(customerUuid);

    await customersService.update(customerUuid, { status: CUSTOMER_STATUS.ACTIVED });

    const loginResponse = await request(httpServer)
      .post('/customers/login')
      .send({ email, password })
      .expect(200);

    return {
      uuid: customerUuid,
      token: loginResponse.body.accessToken as string,
      name: displayName,
    };
  };

  const sendStripeWebhook = async (event: Record<string, any>) => {
    return request(httpServer)
      .post('/payments/webhooks')
      .set('stripe-signature', 'test_signature')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(event))
      .expect(201);
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

  app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    httpServer = app.getHttpServer();

    paymentsService = moduleFixture.get(PaymentsService);
    plansService = moduleFixture.get(PlansService);
    customersService = moduleFixture.get(CustomersService);
    stripeService = moduleFixture.get(StripeService);
    subscriptionService = moduleFixture.get(SubscriptionService);
    cacheService = moduleFixture.get(CacheService);
    dataSource = moduleFixture.get(DataSource);

    paymentRepository = dataSource.getRepository(Payment);
    subscriptionRepository = dataSource.getRepository(Subscription);
    stripeRepository = dataSource.getRepository(StripeMapping);
    planRepository = dataSource.getRepository(Plan);
    salonRepository = dataSource.getRepository(Salon);
    customerSalonRepository = dataSource.getRepository(CustomerSalon);

    (paymentsService as any).stripe = stripeStub;

    await cacheService.reset();

    plan = await plansService.create({
      name: `Stripe E2E Plan ${Date.now()}`,
      description: 'E2E test plan',
      status: PLAN_STATUS.ACTIVE,
      type: PLAN_TYPE.SUBSCRIPTION,
      priceCents: 2999,
      currency: 'USD',
      billingInterval: BILLING_INTERVAL.MONTH,
      billingIntervalCount: 1,
      stripePriceId: planStripePriceId,
      trialPeriodDays: 7,
    });

    stripeSubscriptions[stripeSubscriptionId] = {
      id: stripeSubscriptionId,
      status: 'trialing',
      current_period_start: baseTimestamp,
      current_period_end: baseTimestamp + 30 * 24 * 3600,
      trial_start: baseTimestamp,
      trial_end: baseTimestamp + 7 * 24 * 3600,
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      customer: stripeCustomerId,
      latest_invoice: {
        id: stripeInvoiceId,
        status_transitions: { paid_at: baseTimestamp },
      },
      items: {
        data: [
          {
            price: {
              id: planStripePriceId,
            },
          },
        ],
      },
    };

    stripeInvoices[stripeInvoiceId] = {
      id: stripeInvoiceId,
      subscription: stripeSubscriptionId,
      customer: stripeCustomerId,
      status_transitions: { paid_at: baseTimestamp },
    };

    primaryCustomer = await registerAndLoginCustomer('primary');
    otherCustomer = await registerAndLoginCustomer('secondary');
  });

  afterAll(async () => {
    await paymentRepository.delete({
      customerUuid: primaryCustomer.uuid,
    });
    await subscriptionRepository.delete({ customerUuid: primaryCustomer.uuid });
    await stripeRepository.delete({ customerUuid: primaryCustomer.uuid });
    await planRepository.delete(plan.uuid);

    for (const customerUuid of createdCustomerUuids) {
      try {
        await customersService.remove(customerUuid);
      } catch {
        // ignore cleanup failures
      }
    }

    if (createdSalonUuids.length > 0) {
      await customerSalonRepository.delete({ salonUuid: In(createdSalonUuids) });
      await salonRepository.delete({ uuid: In(createdSalonUuids) });
    }

    await cacheService.reset();
    await app.close();
  });

  describe('Checkout session endpoints', () => {
    it('creates a checkout session for the authenticated customer', async () => {
      const response = await request(httpServer)
        .post('/payments/checkout')
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .send({
          planUuid: plan.uuid,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
      checkoutSessionId = response.body.sessionId;

      const storedSession = stripeSessions[checkoutSessionId];
      expect(storedSession).toBeDefined();
      expect(storedSession.client_reference_id).toBe(primaryCustomer.uuid);
      expect(storedSession.metadata.planUuid).toBe(plan.uuid);

      storedSession.status = 'complete';
      storedSession.payment_status = 'paid';
      storedSession.customer = stripeCustomerId;
      storedSession.subscription = stripeSubscriptionId;
    });

    it('retrieves the checkout session for the creator', async () => {
      const response = await request(httpServer)
        .get(`/payments/session/${checkoutSessionId}`)
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .expect(200);

      expect(response.body.sessionId).toBe(checkoutSessionId);
      expect(response.body.paymentStatus).toBe('paid');
      expect(response.body.subscription).toBe(stripeSubscriptionId);
    });

    it('rejects checkout session access for a different customer', async () => {
      await request(httpServer)
        .get(`/payments/session/${checkoutSessionId}`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .expect(403);
    });
  });

  describe('Webhook processing', () => {
    it('links checkout completion and persists initial subscription', async () => {
      await sendStripeWebhook({
        id: 'evt_checkout_completed',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkoutSessionId,
            customer: stripeCustomerId,
            client_reference_id: primaryCustomer.uuid,
            subscription: stripeSubscriptionId,
            metadata: {
              customerUuid: primaryCustomer.uuid,
              planUuid: plan.uuid,
            },
          },
        },
      });

      const mapping = await stripeService.findByStripeCustomerUuid(stripeCustomerId);
      expect(mapping.customerUuid).toBe(primaryCustomer.uuid);

      const subscription = await subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionId);
      expect(subscription).toBeTruthy();
      expect(subscription?.status).toBe(SUBSCRIPTION_STATUS.TRIALING);
      expect(subscription?.planUuid).toBe(plan.uuid);
      expect(subscription?.salonUuid).toBeDefined();

      if (subscription?.salonUuid) {
        const autoSalon = await salonRepository.findOne({ where: { uuid: subscription.salonUuid } });
        expect(autoSalon).toBeTruthy();
        const expectedSalonName = `${primaryCustomer.name.split(/\s+/)[0]} Salon`;
        expect(autoSalon?.name).toBe(expectedSalonName);
        createdSalonUuids.push(subscription.salonUuid);

        const relations = await customerSalonRepository.find({ where: { salonUuid: subscription.salonUuid } });
        expect(relations.length).toBeGreaterThan(0);
        const ownerRelation = relations.find((relation) => relation.customerUuid === primaryCustomer.uuid);
        expect(ownerRelation).toBeDefined();
        expect(ownerRelation?.roleName).toBe(CUSTOMER_SALON_ROLE.BUSINESS_OWNER);
      }
    });

    it('blocks new checkout sessions when customer already subscribed', async () => {
      const response = await request(httpServer)
        .post('/payments/checkout')
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .send({
          planUuid: plan.uuid,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        })
        .expect(409);

      expect(response.body.message).toContain('active subscription');
    });

    it('keeps subscription in trial status when trial_will_end event arrives', async () => {
      await sendStripeWebhook({
        id: 'evt_trial_will_end',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: stripeSubscriptionId,
          },
        },
      });

      const subscription = await subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionId);
      expect(subscription?.status).toBe(SUBSCRIPTION_STATUS.TRIALING);
    });

    it('processes a successful payment intent and records payment', async () => {
      stripeSubscriptions[stripeSubscriptionId].status = 'active';
      stripeSubscriptions[stripeSubscriptionId].trial_end = baseTimestamp;
      stripeSubscriptions[stripeSubscriptionId].cancel_at_period_end = false;

      await sendStripeWebhook({
        id: 'evt_payment_intent_succeeded',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_success',
            status: 'succeeded',
            amount_received: 2999,
            currency: 'usd',
            created: baseTimestamp + 10,
            invoice: stripeInvoiceId,
            customer: stripeCustomerId,
            metadata: {
              subscription_id: stripeSubscriptionId,
            },
          },
        },
      });

      const subscription = await subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionId);
      expect(subscription?.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);

      const payment = await paymentRepository.findOne({ where: { stripePaymentIntentUuid: 'pi_success' } });
      expect(payment).toBeTruthy();
      expect(payment?.status).toBe(PAYMENT_STATUS.PAID);
      expect(payment?.amountPaid).toBe('29.99');
    });

    it('returns paid payments in history endpoint', async () => {
      const response = await request(httpServer)
        .get('/payments/histories')
        .query({ paymentStatus: PAYMENT_STATUS.PAID })
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].stripePaymentIntentUuid).toBe('pi_success');
      expect(response.body.data[0].subscription.planUuid).toBe(plan.uuid);
    });

    it('handles failed payment intent and invoice failure', async () => {
      stripeInvoices[stripeFailedInvoiceId] = {
        id: stripeFailedInvoiceId,
        subscription: stripeSubscriptionId,
        customer: stripeCustomerId,
        status_transitions: {},
      };

      await sendStripeWebhook({
        id: 'evt_payment_intent_failed',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed',
            status: 'requires_payment_method',
            amount: 2999,
            currency: 'usd',
            created: baseTimestamp + 20,
            invoice: stripeFailedInvoiceId,
            customer: stripeCustomerId,
          },
        },
      });

      await sendStripeWebhook({
        id: 'evt_invoice_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: stripeFailedInvoiceId,
            subscription: stripeSubscriptionId,
            customer: stripeCustomerId,
          },
        },
      });

      const failedPayment = await paymentRepository.findOne({
        where: { stripePaymentIntentUuid: 'pi_failed' },
      });
      expect(failedPayment).toBeTruthy();
      expect(failedPayment?.status).toBe(PAYMENT_STATUS.FAILED);

      const subscription = await subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionId);
      expect(subscription?.status).toBe(SUBSCRIPTION_STATUS.PAST_DUE);

      const historyResponse = await request(httpServer)
        .get('/payments/histories')
        .query({ paymentStatus: PAYMENT_STATUS.FAILED })
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .expect(200);

      expect(historyResponse.body.total).toBe(1);
      expect(historyResponse.body.data[0].stripePaymentIntentUuid).toBe('pi_failed');

      const subscriptionHistory = await request(httpServer)
        .get('/payments/subscriptions/histories')
        .query({ status: SUBSCRIPTION_STATUS.PAST_DUE })
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .expect(200);

      expect(subscriptionHistory.body.total).toBe(1);
      expect(subscriptionHistory.body.data[0].status).toBe(SUBSCRIPTION_STATUS.PAST_DUE);
    });

    it('persists subscription updates and supports period filters', async () => {
      stripeSubscriptions[stripeSubscriptionId] = {
        ...stripeSubscriptions[stripeSubscriptionId],
        status: 'active',
        cancel_at: baseTimestamp + 40 * 24 * 3600,
        cancel_at_period_end: true,
        latest_invoice: {
          id: stripeInvoiceId,
          status_transitions: { paid_at: baseTimestamp + 30 },
        },
      };

      await sendStripeWebhook({
        id: 'evt_subscription_updated',
        type: 'customer.subscription.updated',
        data: {
          object: stripeSubscriptions[stripeSubscriptionId],
        },
      });

      const subscription = await subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionId);
      expect(subscription?.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
      expect(subscription?.cancelAtPeriodEnd).toBe(true);

      const startIso = new Date(subscription!.currentPeriodStartAt!).toISOString();
      const endIso = new Date(subscription!.currentPeriodEndAt!).toISOString();

      const historyWithDates = await request(httpServer)
        .get('/payments/subscriptions/histories')
        .query({
          status: SUBSCRIPTION_STATUS.ACTIVE,
          planUuid: plan.uuid,
          startFrom: startIso,
          startTo: endIso,
          endFrom: startIso,
          endTo: endIso,
        })
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .expect(200);

      expect(historyWithDates.body.total).toBe(1);
      expect(historyWithDates.body.data[0].plan?.uuid).toBe(plan.uuid);
    });

    it('removes subscription on deletion event', async () => {
      await sendStripeWebhook({
        id: 'evt_subscription_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: stripeSubscriptionId,
          },
        },
      });

      const subscription = await subscriptionService.findByStripeSubscriptionUuid(stripeSubscriptionId);
      expect(subscription).toBeNull();

      const historyAfterDeletion = await request(httpServer)
        .get('/payments/subscriptions/histories')
        .set('Authorization', `Bearer ${primaryCustomer.token}`)
        .expect(200);

      expect(historyAfterDeletion.body.total).toBe(0);
    });
  });
});
