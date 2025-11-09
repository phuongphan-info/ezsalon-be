import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SOCIAL_PROVIDER } from '../entities/social-account.entity';

/**
 * Response DTO for SocialAccount entity
 * Separates API response structure from database entity
 */
export class SocialAccountResponse {
  @ApiProperty({ description: 'Social Account UUID' })
  @Expose()
  uuid: string;

  @ApiProperty({ description: 'Social provider UUID' })
  @Expose()
  socialUuid: string;

  @ApiProperty({
    description: 'Social provider name',
    enum: Object.values(SOCIAL_PROVIDER),
  })
  @Expose()
  socialName: string;

  @ApiProperty({ description: 'Email from social provider' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ description: 'Full name from social provider' })
  @Expose()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL from social provider' })
  @Expose()
  avatarUrl?: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
