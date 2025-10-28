import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Plan UUID from your plans catalog' })
  @IsUUID()
  planUuid: string;

  @ApiProperty({ 
    description: 'URL to redirect to after successful payment',
    example: 'http://localhost:3000/success'
  })
  @Matches(/^https?:\/\/.+/, { message: 'successUrl must be a valid URL starting with http:// or https://' })
  successUrl: string;

  @ApiProperty({ 
    description: 'URL to redirect to if payment is cancelled',
    example: 'http://localhost:3000/cancel'
  })
  @Matches(/^https?:\/\/.+/, { message: 'cancelUrl must be a valid URL starting with http:// or https://' })
  cancelUrl: string;
}

export class CheckoutSessionResponse {
  @ApiProperty({ description: 'Stripe Checkout Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Stripe Checkout Session URL' })
  url: string;
}