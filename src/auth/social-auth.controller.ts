import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SocialAccountService } from './services/social-account.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Social Authentication')
@Controller('auth')
export class SocialAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialAccountService: SocialAccountService,
  ) {}

  // Google OAuth Routes
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request) {
    const authResult = req.user as any;
    const { user: customer, socialAccount, isNewUser } = authResult;
    
    const { accessToken } = await this.authService.socialLogin(customer);

    return {
      accessToken,
      customer: {
        uuid: customer.uuid,
        email: customer.email,
        name: customer.name,
        avatar: customer.avatar,
        role: customer.role,
        isNewUser,
      },
      socialAccount: {
        uuid: socialAccount.uuid,
        socialName: socialAccount.socialName,
        displayName: socialAccount.displayName,
        avatarUrl: socialAccount.avatarUrl,
      },
    };
  }

  // Facebook OAuth Routes
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {}

  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req: Request) {
    const authResult = req.user as any;
    const { user: customer, socialAccount, isNewUser } = authResult;
    
    const { accessToken } = await this.authService.socialLogin(customer);

    return {
      accessToken,
      customer: {
        uuid: customer.uuid,
        email: customer.email,
        name: customer.name,
        avatar: customer.avatar,
        role: customer.role,
        isNewUser,
      },
      socialAccount: {
        uuid: socialAccount.uuid,
        socialName: socialAccount.socialName,
        displayName: socialAccount.displayName,
        avatarUrl: socialAccount.avatarUrl,
      },
    };
  }

  // Social accounts management
  @ApiOperation({ summary: 'Get customer social accounts' })
  @Get('social/accounts')
  async getSocialAccounts(@Req() req: Request) {
    // This would require authentication middleware to get current customer
    const customerUuid = req.user?.['uuid'];
    if (!customerUuid) {
      return { socialAccounts: [] };
    }

    const socialAccounts = await this.socialAccountService.findByCustomerUuid(customerUuid);
    return {
      socialAccounts: socialAccounts.map(account => ({
        uuid: account.uuid,
        socialName: account.socialName,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        email: account.email,
        createdAt: account.createdAt,
      })),
    };
  }
}
