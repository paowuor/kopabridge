import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/roles/roles.enum';

/**
 * Throws ForbiddenException unless the authenticated user IS the resource
 * owner (targetUserId) or holds the ADMIN role. Use this in any handler
 * that takes a userId (or an id that resolves to one) as a path param, to
 * stop one logged-in user from reading/writing another user's data.
 */
export function assertSelfOrAdmin(
  user: AuthenticatedUser | undefined,
  targetUserId: string,
): void {
  if (!user) {
    throw new ForbiddenException('Access denied: User session data missing.');
  }

  if (user.role === Role.ADMIN) {
    return;
  }

  if (user.userId !== targetUserId) {
    throw new ForbiddenException(
      'Access denied: you may only access your own resources.',
    );
  }
}
