import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { SocialAccountService } from '../services/social-account.service';
import { SOCIAL_PROVIDER } from '../entities/social-account.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private socialAccountService: SocialAccountService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}${process.env.SOCIAL_LOGIN_GOOGLE_CALLBACK}`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;
      
      const profileData = {
        socialId: id,
        socialName: SOCIAL_PROVIDER.GOOGLE,
        email: emails[0].value,
        firstName: name.givenName,
        lastName: name.familyName,
        displayName: name.givenName + ' ' + name.familyName,
        avatarUrl: photos && photos.length > 0 ? photos[0].value : null,
        accessToken,
        refreshToken,
        tokenExpiresAt: null, // Google tokens don't have a specific expiry in this flow
      };
      
      const { customer, socialAccount, isNewCustomer  } = await this.socialAccountService.handleSocialLogin(
        id,
        SOCIAL_PROVIDER.GOOGLE,
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
