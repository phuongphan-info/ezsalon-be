import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomerSalonsService } from '../customer-salons.service';
import { SALON_MANAGEMENT_KEY } from '../decorators/salon-management.decorator';

/**
 * Guard that validates salon management rights based on the @SalonManagement() decorator.
 * 
 * This guard checks if the current customer has management rights
 * (Business Owner, Owner, or Manager) over the salon specified in route parameters.
 * 
 * It only enforces validation when the @SalonManagement() decorator is present.
 * Otherwise, it allows the request to proceed.
 */
@Injectable()
export class SalonManagementGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private customerSalonsService: CustomerSalonsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked with @SalonManagement()
    const requiresSalonManagement = this.reflector.getAllAndOverride<boolean>(
      SALON_MANAGEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not marked, allow access (permissive by default)
    if (!requiresSalonManagement) {
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

    // Validate salon management - will throw ForbiddenException if not authorized
    await this.customerSalonsService.validateSalonManagement(
      customer.uuid,
      salonUuid,
    );

    return true;
  }
}
