import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RolesService } from '../roles/services/roles.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user info and permissions' })
  @ApiResponse({ status: 200, description: 'User info and permissions retrieved' })
  async getMe(@CurrentUser() currentUser: any) {
    const user = await this.usersService.findOne(currentUser.userId);
    const permissions = await this.rolesService.getUserPermissions(currentUser.userId);
    
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      permissions: permissions.map(p => p.name),
    };
  }

  // Google OAuth Routes
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@CurrentUser() currentUser: any) {
    return await this.doSocialLogin(currentUser);
  }

  // Facebook OAuth Routes
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {}

  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@CurrentUser() currentUser: any) {
    return await this.doSocialLogin(currentUser);
  }

  // Apple OAuth Routes
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth() {}

  @ApiOperation({ summary: 'Apple OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT token and customer info as JSON' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthRedirect(@CurrentUser() currentUser: any) {
    return await this.doSocialLogin(currentUser);
  }

  private async doSocialLogin(authResult: any): Promise<any> {
    const { user: customer, socialAccount, isNewUser } = authResult as any;
    
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
}
