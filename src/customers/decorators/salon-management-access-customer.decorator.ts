import { SetMetadata } from '@nestjs/common';

export const SALON_MANAGEMENT_ACCESS_CUSTOMER_KEY = 'salonManagementAccessCustomer';

/**
 * Decorator to mark endpoints that require validation that the current customer
 * can access/manage the target customer based on role hierarchy.
 * 
 * This validates that:
 * - Business Owner can access Owner, Manager, Front Desk, Staff
 * - Owner can access Manager, Front Desk, Staff
 * - Manager can access Front Desk, Staff
 * 
 * Requires both salonUuid and target customer uuid in params.
 * The target customer must be fetched and available in the endpoint.
 * 
 * @example
 * @Patch(':salonUuid/:uuid')
 * @SalonManagementAccessCustomer()
 * async update(
 *   @Param('salonUuid') salonUuid: string,
 *   @Param('uuid') uuid: string
 * ) { ... }
 */
export const SalonManagementAccessCustomer = () => 
  SetMetadata(SALON_MANAGEMENT_ACCESS_CUSTOMER_KEY, true);
