import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomerSalonsService } from '../customer-salons.service';
import { CUSTOMER_SALON_ROLE } from '../entities/customer-salon.entity';

export const MANAGER_OR_OWNER_ONLY_KEY = 'managerOrOwnerOnly';
export const ManagerOrOwnerOnly = () => (target: any, key: string, descriptor: PropertyDescriptor) => {
  Reflect.defineMetadata(MANAGER_OR_OWNER_ONLY_KEY, true, descriptor.value);
  return descriptor;
};

@Injectable()
export class ManagerOrOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private customerSalonsService: CustomerSalonsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const managerOrOwnerOnly = this.reflector.getAllAndOverride<boolean>(MANAGER_OR_OWNER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!managerOrOwnerOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.customer) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if the customer is marked as owner directly
    if (user.customer.isOwner) {
      return true;
    }

    // Check if the customer has any OWNER or MANAGER roles in any salon
    const customerSalons = await this.customerSalonsService.findByCustomer(user.customer.uuid);
    
    const hasOwnerOrManagerRole = customerSalons.some(
      cs => cs.roleName === CUSTOMER_SALON_ROLE.OWNER || cs.roleName === CUSTOMER_SALON_ROLE.MANAGER
    );

    if (!hasOwnerOrManagerRole) {
      throw new ForbiddenException('Only owners and managers can access this resource');
    }

    return true;
  }
}
