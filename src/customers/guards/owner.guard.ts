import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNER_ONLY_KEY } from '../decorators/owner-only.decorator';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ownerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!ownerOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.customer) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.customer.isOwner) {
      throw new ForbiddenException('Only owners can perform this action');
    }

    return true;
  }
}
