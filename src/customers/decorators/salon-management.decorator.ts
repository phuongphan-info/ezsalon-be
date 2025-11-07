import { SetMetadata } from '@nestjs/common';

export const SALON_MANAGEMENT_KEY = 'salonManagement';

/**
 * Decorator to mark endpoints that require salon management validation.
 * Use this on endpoints that require the authenticated customer to have
 * management rights (Business Owner, Owner, or Manager) over the salon.
 * 
 * @example
 * @Get(':salonUuid/:uuid')
 * @SalonManagement()
 * async findOne(@Param('salonUuid') salonUuid: string) { ... }
 */
export const SalonManagement = () => SetMetadata(SALON_MANAGEMENT_KEY, true);
