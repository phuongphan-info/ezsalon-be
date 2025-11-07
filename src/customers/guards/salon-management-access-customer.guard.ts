import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomerSalonsService } from '../customer-salons.service';
import { CustomersService } from '../customers.service';
import { SALON_MANAGEMENT_ACCESS_CUSTOMER_KEY } from '../decorators/salon-management-access-customer.decorator';

/**
 * Guard that validates access to target customer based on role hierarchy.
 * 
 * This guard checks if the current customer can access/manage the target customer
 * based on their roles in the salon:
 * - Business Owner can access Owner, Manager, Front Desk, Staff
 * - Owner can access Manager, Front Desk, Staff
 * - Manager can access Front Desk, Staff
 * 
 * It fetches the target customer and validates access rights.
 * Only enforces when the @SalonManagementAccessCustomer() decorator is present.
 */
@Injectable()
export class SalonManagementAccessCustomerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private customerSalonsService: CustomerSalonsService,
    private customersService: CustomersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked with @SalonManagementAccessCustomer()
    const requiresAccessValidation = this.reflector.getAllAndOverride<boolean>(
      SALON_MANAGEMENT_ACCESS_CUSTOMER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not marked, allow access (permissive by default)
    if (!requiresAccessValidation) {
      return true;
    }

    // Extract request and customer data
    const request = context.switchToHttp().getRequest();
    const customer = request.user?.customer;
    const salonUuid = request.params?.salonUuid;
    const targetCustomerUuid = request.params?.uuid;

    // If no customer, salonUuid, or target uuid, let other guards handle it
    if (!customer || !salonUuid || !targetCustomerUuid) {
      return true;
    }

    // Fetch the target customer to validate access
    const foundCustomer = await this.customersService.findOne(salonUuid, targetCustomerUuid);
    if (!foundCustomer) {
      throw new NotFoundException(`Customer with UUID "${targetCustomerUuid}" not found in salon "${salonUuid}"`);
    }

    // Store the found customer in request for use in the endpoint
    request.foundCustomer = foundCustomer;

    // Validate access rights - will throw ForbiddenException if not authorized
    await this.customerSalonsService.validateSalonManagementAccessCustomer(
      customer.uuid,
      salonUuid,
      foundCustomer.uuid,
    );

    return true;
  }
}
