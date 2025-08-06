import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CUSTOMER_SALON_ROLE } from '../entities/customer-salon.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<CUSTOMER_SALON_ROLE[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }

    // Since roles are now salon-specific, we'll temporarily allow all authenticated users
    // Role-based authorization should be implemented at the service level using CustomerSalon relationships
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.customer) {
      throw new ForbiddenException('Access denied');
    }

    // TODO: Implement salon-specific role checking
    // For now, just allow all authenticated customers
    return true;
  }
}
