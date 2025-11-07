import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const SALON_OWNERSHIP_KEY = 'salonOwnership';

/**
 * Decorator to mark endpoints that require salon ownership validation.
 * Use this on endpoints that require the authenticated customer to have
 * ownership/management rights over the salon specified in the route params.
 * 
 * @example
 * @Post(':salonUuid')
 * @SalonOwnership()
 * async create(@Param('salonUuid') salonUuid: string) { ... }
 */
export const SalonOwnership = () => SetMetadata(SALON_OWNERSHIP_KEY, true);
