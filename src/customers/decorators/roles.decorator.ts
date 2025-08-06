import { SetMetadata } from '@nestjs/common';
import { CUSTOMER_SALON_ROLE } from '../entities/customer-salon.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: CUSTOMER_SALON_ROLE[]) => SetMetadata(ROLES_KEY, roles);
