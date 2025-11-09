import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RolesService } from '../roles/services/roles.service';
import { UserLoginResponse, UserProfileResponse, UserResponse } from './dto/auth.response';
import { plainToInstance } from 'class-transformer';

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
  @ApiResponse({ status: 200, description: 'User logged in successfully', type: UserLoginResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<UserLoginResponse> {
    const { accessToken, user } = await this.authService.login(loginDto);
    return {
      accessToken,
      user: plainToInstance(UserResponse, user, { excludeExtraneousValues: true })
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user info and permissions' })
  @ApiResponse({ status: 200, description: 'User info and permissions retrieved', type: UserProfileResponse })
  async getMe(@CurrentUser() currentUser: any): Promise<UserProfileResponse> {
    const user = await this.usersService.findOne(currentUser.userId);
    const permissions = await this.rolesService.getUserPermissions(currentUser.userId);
    return {
      user: plainToInstance(UserResponse, user, { excludeExtraneousValues: true }),
      permissions: permissions.map(p => p.name),
    };
  }
}
