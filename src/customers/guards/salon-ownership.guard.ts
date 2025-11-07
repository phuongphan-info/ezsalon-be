import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomerSalonsService } from '../customer-salons.service';
import { SALON_OWNERSHIP_KEY } from '../decorators/salon-ownership.decorator';

/**
 * Guard that validates salon ownership based on the @SalonOwnership() decorator.
 * 
 * This guard checks if the current customer has ownership/management rights
 * over the salon specified in the route parameters (salonUuid).
 * 
 * It only enforces validation when the @SalonOwnership() decorator is present.
 * Otherwise, it allows the request to proceed.
 */
@Injectable()
export class SalonOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private customerSalonsService: CustomerSalonsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked with @SalonOwnership()
    const requiresSalonOwnership = this.reflector.getAllAndOverride<boolean>(
      SALON_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not marked, allow access (permissive by default)
    if (!requiresSalonOwnership) {
      return true;
    }

    // Extract request and customer data
    const request = context.switchToHttp().getRequest();
    const customer = request.user?.customer;
    const salonUuid = request.params?.salonUuid;

    // If no customer or salonUuid, let other guards handle it
    if (!customer || !salonUuid) {
      return true;
    }

    // Validate salon ownership - will throw ForbiddenException if not authorized
    await this.customerSalonsService.validateSalonOwnership(
      customer.uuid,
      salonUuid,
    );

    return true;
  }
}
