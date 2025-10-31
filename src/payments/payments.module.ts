import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PlansModule } from '../plans/plans.module';
import { CustomersModule } from '../customers/customers.module';
import { SalonsModule } from '../salons/salons.module';
import { Subscription } from './entities/subscription.entity';
import { Stripe } from './entities/stripe.entity';
import { Payment } from './entities/payment.entity';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    ConfigModule,
    PlansModule,
    CustomersModule,
    SalonsModule,
    TypeOrmModule.forFeature([Subscription, Stripe, Payment]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService, SubscriptionService],
  exports: [PaymentsService],
})
export class PaymentsModule {}