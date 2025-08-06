import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/auth.dto';
import { USER } from '../users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user status is ACTIVED
    if (user.status !== USER.STATUS_ACTIVED) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.uuid };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.uuid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async socialLogin(user: any) {
    const payload = { email: user.email, sub: user.uuid };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      (await this.usersService.validatePassword(password, user.password))
    ) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }
}
