import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Must read the same constant @Roles() writes, or renaming it would
    // silently make every route pass.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: User session data missing.');
    }

    const role = user.role;

    if (typeof role !== 'string') {
      throw new ForbiddenException('Access denied: User session data missing.');
    }

    // Deny explicitly rather than returning false so every denial path
    // produces the same response body, and so the reason for the required
    // role is never disclosed to the caller.
    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException('Access denied: insufficient role.');
    }

    return true;
  }
}
