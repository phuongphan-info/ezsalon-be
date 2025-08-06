import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomersService } from '../customers.service';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(private customersService: CustomersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // Ensure this is a customer token
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Invalid token type');
    }

    const customer = await this.customersService.findByEmail(payload.email);
    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    return { 
      uuid: payload.sub, 
      customerId: payload.sub, 
      email: payload.email, 
      type: 'customer',
      customer 
    };
  }
}
