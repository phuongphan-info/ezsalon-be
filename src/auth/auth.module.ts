import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SocialAccountService } from './services/social-account.service';
import { SocialAccount } from './entities/social-account.entity';
import { RolesModule } from '../roles/roles.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { CustomersModule } from 'src/customers/customers.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SocialAccount]),
    UsersModule,
    CustomersModule, 
    RolesModule, 
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SocialAccountService, JwtStrategy, GoogleStrategy, FacebookStrategy],
  exports: [AuthService, SocialAccountService],
})
export class AuthModule {}
