import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/auth.dto';
import { CUSTOMER_STATUS } from '../customers/entities/customer.entity';
import { CustomersService } from 'src/customers/customers.service';

@Injectable()
export class AuthService {
  constructor(
    private customersService: CustomersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const customer = await this.customersService.findByEmail(loginDto.email);

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if customer status is ACTIVED
    if (customer.status !== CUSTOMER_STATUS.ACTIVED) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    const isPasswordValid = await this.customersService.validatePassword(
      loginDto.password,
      customer.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: customer.email, sub: customer.uuid };
    return {
      accessToken: this.jwtService.sign(payload),
      customer: {
        id: customer.uuid,
        email: customer.email,
        name: customer.name,
      },
    };
  }

  async socialLogin(customer: any) {
    const payload = { email: customer.email, sub: customer.uuid };
    return {
      accessToken: this.jwtService.sign(payload),
      customer: {
        uuid: customer.uuid,
        email: customer.email,
        name: customer.name,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const customer = await this.customersService.findByEmail(email);
    if (
      customer &&
      (await this.customersService.validatePassword(password, customer.password))
    ) {
      const { password: _, ...result } = customer;
      return result;
    }
    return null;
  }
}
