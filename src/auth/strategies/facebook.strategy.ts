import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { SocialAccountService } from '../services/social-account.service';
import { SOCIAL_PROVIDER } from '../entities/social-account.entity';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private socialAccountService: SocialAccountService) {
    super({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.BASE_URL}${process.env.SOCIAL_LOGIN_FACEBOOK_CALLBACK}`,
      scope: 'email',
      profileFields: ['emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;
      
      const profileData = {
        socialId: id,
        socialName: SOCIAL_PROVIDER.FACEBOOK,
        email: emails && emails.length > 0 ? emails[0].value : `${id}@facebook.com`,
        firstName: name.givenName,
        lastName: name.familyName,
        displayName: name.givenName + ' ' + name.familyName,
        avatarUrl: photos && photos.length > 0 ? photos[0].value : null,
        accessToken,
        refreshToken,
        tokenExpiresAt: null, // Facebook tokens don't have a specific expiry in this flow
      };
      
      const { customer, socialAccount, isNewCustomer } = await this.socialAccountService.handleSocialLogin(
        id,
        SOCIAL_PROVIDER.FACEBOOK,
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
