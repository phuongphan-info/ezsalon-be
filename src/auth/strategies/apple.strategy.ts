import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-apple';
import { SocialAccountService } from '../services/social-account.service';
import { SOCIAL_PROVIDER } from '../entities/social-account.entity';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private socialAccountService: SocialAccountService) {
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      callbackURL: `${process.env.BASE_URL}${process.env.SOCIAL_LOGIN_APPLE_CALLBACK}`,
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, name } = profile;
      const email = emails && emails.length > 0 ? emails[0].value : undefined;
      const displayName = name ? `${name.firstName || ''} ${name.lastName || ''}`.trim() : undefined;

      const profileData = {
        socialId: id,
        socialName: SOCIAL_PROVIDER.APPLE,
        email,
        firstName: name?.firstName,
        lastName: name?.lastName,
        displayName,
        avatarUrl: null,
        accessToken,
        refreshToken,
        tokenExpiresAt: null,
      };

      const { customer, socialAccount, isNewCustomer } = await this.socialAccountService.handleSocialLogin(
        id,
        SOCIAL_PROVIDER.APPLE,
        profileData,
      );
      
      done(null, {
        user: customer,
        socialAccount,
        isNewCustomer,
      });
    } catch (error) {
      done(error, null);
    }
  }
}
