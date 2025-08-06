import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccount, SOCIAL_PROVIDER, SOCIAL_ACCOUNT_TABLE_NAME } from '../entities/social-account.entity';
import { CacheService } from 'src/common/services/cache.service';
import { CustomersService } from 'src/customers/customers.service';
import { Customer } from 'src/customers/entities/customer.entity';

export interface CreateSocialAccountDto {
  socialUuid: string;
  socialName: SOCIAL_PROVIDER;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  profileData?: any;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

@Injectable()
export class SocialAccountService {
  constructor(
    @InjectRepository(SocialAccount)
    private readonly socialAccountRepository: Repository<SocialAccount>,
    private readonly customersService: CustomersService,
    private readonly cacheService: CacheService,
  ) {}

  async findBySocialUuid(socialUuid: string, socialName: SOCIAL_PROVIDER): Promise<SocialAccount | null> {
    return await this.cacheService.caching(
      SOCIAL_ACCOUNT_TABLE_NAME,
      { socialUuid, socialName },
      async () => {
        return this.socialAccountRepository.findOne({
          where: { socialUuid, socialName },
          relations: ['customer'],
        });
      }
    );
  }

  async findByEmail(email: string, socialName: SOCIAL_PROVIDER): Promise<SocialAccount | null> {
    return await this.cacheService.caching(
      SOCIAL_ACCOUNT_TABLE_NAME,
      { email, socialName },
      async () => {
        return this.socialAccountRepository.findOne({
          where: { email, socialName },
          relations: ['customer'],
        });
      }
    );
  }

  async findByCustomerUuid(customerUuid: string): Promise<SocialAccount[]> {
    return await this.cacheService.caching(
      SOCIAL_ACCOUNT_TABLE_NAME,
      { customerUuid },
      async () => {
        return this.socialAccountRepository.find({
          where: { customer: { uuid: customerUuid } },
          relations: ['customer'],
        });
      }
    );
  }

  async createSocialAccount(
    customer: Customer,
    socialData: CreateSocialAccountDto,
  ): Promise<SocialAccount> {
    const socialAccount = this.socialAccountRepository.create({
      socialUuid: socialData.socialUuid,
      socialName: socialData.socialName,
      email: socialData.email,
      displayName: socialData.displayName,
      avatarUrl: socialData.avatarUrl,
      profileData: socialData.profileData,
      customer,
    });

    return this.socialAccountRepository.save(socialAccount);
  }

  async handleSocialLogin(
    socialUuid: string,
    socialName: SOCIAL_PROVIDER,
    profileData: any,
  ): Promise<{ customer: Customer; socialAccount: SocialAccount; isNewCustomer: boolean }> {
    // First, try to find existing social account
    let socialAccount = await this.findBySocialUuid(socialUuid, socialName);
    let customer: Customer;
    let isNewCustomer = false;

    if (socialAccount) {
      // Social account exists, update profile data
      socialAccount.profileData = profileData;
      socialAccount.displayName = profileData.displayName;
      socialAccount.avatarUrl = profileData.avatarUrl;
      socialAccount.email = profileData.email;
      await this.socialAccountRepository.save(socialAccount);
      customer = socialAccount.customer;
    } else {
      // Social account doesn't exist, check if customer exists by email
      customer = await this.customersService.findByEmail(profileData.email);
      if (!customer) {
        // Customer doesn't exist, create new one
        customer = await this.customersService.createSocialCustomer({
          email: profileData.email,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          avatar: profileData.avatarUrl,
        });
        isNewCustomer = true;
      }

      // Create social account for this customer
      socialAccount = await this.createSocialAccount(customer, {
        socialUuid,
        socialName,
        email: profileData.email,
        displayName: profileData.displayName,
        avatarUrl: profileData.avatarUrl,
        profileData,
      });
    }

    return { customer, socialAccount, isNewCustomer };
  }

  async unlinkSocialAccount(customerUuid: string, socialName: SOCIAL_PROVIDER): Promise<void> {
    const socialAccount = await this.socialAccountRepository.findOne({
      where: { customer: { uuid: customerUuid }, socialName },
    });

    if (!socialAccount) {
      throw new NotFoundException('Social account not found');
    }

    await this.socialAccountRepository.remove(socialAccount);
  }
}
