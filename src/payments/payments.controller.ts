import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponse,
  PaymentHistoryResponse,
  PaymentHistoryQueryDto,
  SubscriptionHistoryResponse,
  SubscriptionHistoryQueryDto,
} from './dto/payments.dto';
import { CustomerJwtAuthGuard } from 'src/customers/guards/customer-jwt-auth.guard';
import { CurrentCustomer } from 'src/customers/decorators/current-customer.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}
  
  @Post('checkout')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a checkout session for subscription' })
  @ApiResponse({ status: 201, type: CheckoutSessionResponse })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentCustomer() currentCustomer: any,
  ): Promise<CheckoutSessionResponse> {
    return await this.paymentsService.createCheckoutSession(
      dto.planUuid,
      dto.successUrl,
      dto.cancelUrl,
      currentCustomer?.customer,
    );
  }

  @Get('histories')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment history for current customer' })
  @ApiResponse({ status: 200, type: PaymentHistoryResponse })
  async getPaymentHistory(
    @Query() query: PaymentHistoryQueryDto,
    @CurrentCustomer() currentCustomer: any,
  ): Promise<PaymentHistoryResponse> {
    const customer = currentCustomer?.customer;
    if (!customer?.uuid) {
      throw new NotFoundException('Customer not found');
    }

    return await this.paymentsService.getCustomerPaymentHistory(customer.uuid, query);
  }

  @Get('subscriptions/histories')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription history for current customer' })
  @ApiResponse({ status: 200, type: SubscriptionHistoryResponse })
  async getSubscriptionHistory(
    @Query() query: SubscriptionHistoryQueryDto,
    @CurrentCustomer() currentCustomer: any,
  ): Promise<SubscriptionHistoryResponse> {
    const customer = currentCustomer?.customer;
    if (!customer?.uuid) {
      throw new NotFoundException('Customer not found');
    }

    return await this.paymentsService.getCustomerSubscriptionHistory(customer.uuid, query);
  }
  
  @Get('session/:sessionId')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get checkout session details' })
  async getCheckoutSession(
    @Param('sessionId') sessionId: string,
    @CurrentCustomer() currentCustomer: any,
  ) {
    return await this.paymentsService.getCheckoutSession(sessionId, currentCustomer?.customer);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Handle Stripe subscription webhooks' })
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const body = req.rawBody || req.body;
    
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    return await this.paymentsService.handleWebhook(body, signature);
  }
}